-- Biblioteca Geral V1 — vinculo de pergunta com itens da biblioteca e
-- snapshot imutavel do contexto do formulario.

-- ============================================================
-- question_library_binding
-- ============================================================

create table if not exists question_library_binding (
  question_id uuid primary key references questions(id) on delete cascade,
  axis_id uuid references library_axes(id) on delete restrict,
  section_id uuid references library_sections(id) on delete restrict,
  metric_id uuid references library_metrics(id) on delete restrict,
  bindings jsonb not null default '{}',
  coverage_score numeric(5,2) not null default 0,
  updated_by uuid,
  updated_at timestamptz not null default now()
);

create index if not exists question_library_binding_axis_idx
  on question_library_binding(axis_id);
create index if not exists question_library_binding_section_idx
  on question_library_binding(section_id);
create index if not exists question_library_binding_metric_idx
  on question_library_binding(metric_id);

drop trigger if exists question_library_binding_set_updated_at on question_library_binding;
create trigger question_library_binding_set_updated_at
before update on question_library_binding
for each row execute function set_updated_at();

alter table question_library_binding enable row level security;

drop policy if exists "question_library_binding read staff" on question_library_binding;
create policy "question_library_binding read staff"
on question_library_binding for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "question_library_binding write admin" on question_library_binding;
create policy "question_library_binding write admin"
on question_library_binding for all
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

-- ============================================================
-- form_question_library_snapshot
-- ============================================================

create table if not exists form_question_library_snapshot (
  form_id uuid not null references forms(id) on delete cascade,
  form_version integer not null,
  question_id uuid not null references questions(id) on delete cascade,
  axis_version_id uuid references library_item_versions(id),
  section_version_id uuid references library_item_versions(id),
  metric_version_id uuid references library_item_versions(id),
  recommendation_version_ids uuid[] not null default '{}',
  action_version_ids uuid[] not null default '{}',
  bindings jsonb not null default '{}',
  captured_at timestamptz not null default now(),
  hash text not null,
  primary key (form_id, form_version, question_id)
);

create index if not exists form_question_library_snapshot_question_idx
  on form_question_library_snapshot(question_id);
create index if not exists form_question_library_snapshot_form_idx
  on form_question_library_snapshot(form_id, form_version);

alter table form_question_library_snapshot enable row level security;

drop policy if exists "form_question_library_snapshot read staff" on form_question_library_snapshot;
create policy "form_question_library_snapshot read staff"
on form_question_library_snapshot for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "form_question_library_snapshot insert admin" on form_question_library_snapshot;
create policy "form_question_library_snapshot insert admin"
on form_question_library_snapshot for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

-- ============================================================
-- Extensao de recommendations: referencia opcional ao snapshot
-- ============================================================

alter table recommendations
  add column if not exists snapshot_hash text,
  add column if not exists recommendation_version_id uuid references library_item_versions(id),
  add column if not exists confidence_score numeric(5,2),
  add column if not exists rule_version text,
  add column if not exists scenario text;

create index if not exists recommendations_snapshot_idx on recommendations(snapshot_hash);
