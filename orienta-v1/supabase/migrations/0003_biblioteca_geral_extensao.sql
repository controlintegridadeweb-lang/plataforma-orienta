-- Biblioteca Geral V1 — extensao de ciclo de vida, versionamento e metadados
-- Aplica apos 0002_biblioteca_geral.sql.

-- ============================================================
-- Enums
-- ============================================================

do $$ begin
  create type library_item_status as enum (
    'draft',
    'in_review',
    'published',
    'deprecated',
    'archived'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type library_recommendation_type as enum (
    'nao_implementacao',
    'implementacao_parcial',
    'ausencia_evidencia',
    'evidencia_insuficiente'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type library_severity as enum ('high', 'medium', 'low');
exception when duplicate_object then null; end $$;

-- ============================================================
-- Colunas comuns adicionadas a todas as tabelas library_*
-- ============================================================

create or replace function library_apply_common_columns(target regclass)
returns void language plpgsql as $$
declare
  ident text := target::text;
begin
  execute format($f$alter table %s add column if not exists status library_item_status not null default 'draft'$f$, ident);
  execute format($f$alter table %s add column if not exists version_major integer not null default 0$f$, ident);
  execute format($f$alter table %s add column if not exists version_minor integer not null default 1$f$, ident);
  execute format($f$alter table %s add column if not exists version_patch integer not null default 0$f$, ident);
  execute format($f$alter table %s add column if not exists vigente_de timestamptz$f$, ident);
  execute format($f$alter table %s add column if not exists vigente_ate timestamptz$f$, ident);
  execute format($f$alter table %s add column if not exists tags text[] not null default '{}'$f$, ident);
  execute format($f$alter table %s add column if not exists created_by uuid$f$, ident);
  execute format($f$alter table %s add column if not exists updated_by uuid$f$, ident);
  execute format($f$alter table %s add column if not exists approved_by uuid$f$, ident);
  execute format($f$alter table %s add column if not exists approved_at timestamptz$f$, ident);
  execute format($f$alter table %s add column if not exists deprecated_by uuid$f$, ident);
  execute format($f$alter table %s add column if not exists deprecated_at timestamptz$f$, ident);
end;
$$;

select library_apply_common_columns('library_axes');
select library_apply_common_columns('library_sections');
select library_apply_common_columns('library_metrics');
select library_apply_common_columns('library_recommendations');
select library_apply_common_columns('library_actions');

drop function library_apply_common_columns(regclass);

-- ============================================================
-- Campos especificos
-- ============================================================

alter table library_metrics
  add column if not exists description text,
  add column if not exists severity_hint library_severity not null default 'medium',
  add column if not exists trigger_summary text;

alter table library_recommendations
  add column if not exists tipo library_recommendation_type not null default 'nao_implementacao',
  add column if not exists texto_base_fixo text,
  add column if not exists texto_base_parametrizavel text,
  add column if not exists variaveis_parametro jsonb not null default '[]',
  add column if not exists fundamento_tecnico text,
  add column if not exists escopo_aplicacao text;

alter table library_actions
  add column if not exists suggested_priority library_priority not null default 'medium',
  add column if not exists suggested_responsible_area text,
  add column if not exists fundamento_tecnico text,
  add column if not exists criterio_conclusao text;

-- ============================================================
-- library_recommendation_actions (N:N)
-- ============================================================

create table if not exists library_recommendation_actions (
  recommendation_id uuid not null references library_recommendations(id) on delete cascade,
  action_id uuid not null references library_actions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (recommendation_id, action_id)
);

create index if not exists library_recommendation_actions_action_idx
  on library_recommendation_actions(action_id);

-- ============================================================
-- library_item_versions (historico imutavel)
-- ============================================================

create table if not exists library_item_versions (
  id uuid primary key default gen_random_uuid(),
  item_type text not null check (item_type in ('axis','section','metric','recommendation','action')),
  item_id uuid not null,
  version text not null,
  version_major integer not null,
  version_minor integer not null,
  version_patch integer not null,
  payload jsonb not null,
  hash text not null,
  vigente_de timestamptz not null,
  vigente_ate timestamptz,
  previous_version_id uuid references library_item_versions(id) on delete set null,
  published_by uuid,
  published_at timestamptz not null default now(),
  deprecated_by uuid,
  deprecated_at timestamptz,
  created_at timestamptz not null default now(),
  unique (item_type, item_id, version)
);

create index if not exists library_item_versions_item_idx
  on library_item_versions(item_type, item_id);
create index if not exists library_item_versions_hash_idx
  on library_item_versions(hash);

-- ============================================================
-- library_vocabulary_tags (vocabulario controlado)
-- ============================================================

create table if not exists library_vocabulary_tags (
  tag text primary key,
  description text,
  approved boolean not null default false,
  created_by uuid,
  created_at timestamptz not null default now(),
  approved_by uuid,
  approved_at timestamptz
);

-- ============================================================
-- Indices de busca nos itens
-- ============================================================

create index if not exists library_axes_status_idx on library_axes(status);
create index if not exists library_sections_status_idx on library_sections(status);
create index if not exists library_metrics_status_idx on library_metrics(status);
create index if not exists library_recommendations_status_idx on library_recommendations(status);
create index if not exists library_actions_status_idx on library_actions(status);

create index if not exists library_axes_tags_idx on library_axes using gin (tags);
create index if not exists library_sections_tags_idx on library_sections using gin (tags);
create index if not exists library_metrics_tags_idx on library_metrics using gin (tags);
create index if not exists library_recommendations_tags_idx on library_recommendations using gin (tags);
create index if not exists library_actions_tags_idx on library_actions using gin (tags);

-- ============================================================
-- Row Level Security para novas tabelas
-- ============================================================

alter table library_recommendation_actions enable row level security;
alter table library_item_versions enable row level security;
alter table library_vocabulary_tags enable row level security;

drop policy if exists "library_recommendation_actions read staff" on library_recommendation_actions;
create policy "library_recommendation_actions read staff"
on library_recommendation_actions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_recommendation_actions write admin" on library_recommendation_actions;
create policy "library_recommendation_actions write admin"
on library_recommendation_actions for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "library_item_versions read staff" on library_item_versions;
create policy "library_item_versions read staff"
on library_item_versions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_item_versions insert admin" on library_item_versions;
create policy "library_item_versions insert admin"
on library_item_versions for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

drop policy if exists "library_vocabulary_tags read staff" on library_vocabulary_tags;
create policy "library_vocabulary_tags read staff"
on library_vocabulary_tags for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_vocabulary_tags write admin" on library_vocabulary_tags;
create policy "library_vocabulary_tags write admin"
on library_vocabulary_tags for all
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
)
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);
