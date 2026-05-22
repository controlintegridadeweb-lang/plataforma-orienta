-- Biblioteca Geral: catalogos administrativos reutilizaveis.
create type library_metric_answer_type as enum (
  'yes_no',
  'yes_no_partial',
  'scale',
  'numeric',
  'text'
);

create type library_metric_interpretation as enum (
  'higher_better',
  'lower_better',
  'qualitative'
);

create type library_priority as enum ('high', 'medium', 'low');

create table if not exists library_axes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_sections (
  id uuid primary key default gen_random_uuid(),
  axis_id uuid not null references library_axes(id) on delete restrict,
  code text not null unique,
  name text not null,
  description text,
  ordem integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_metrics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  answer_type library_metric_answer_type not null,
  interpretation library_metric_interpretation not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_recommendations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  priority library_priority not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists library_actions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  suggested_deadline_days integer not null check (suggested_deadline_days between 1 and 3650),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists library_sections_axis_idx on library_sections(axis_id);
create index if not exists library_axes_ordem_idx on library_axes(ordem);
create index if not exists library_sections_ordem_idx on library_sections(axis_id, ordem);

create trigger library_axes_set_updated_at
before update on library_axes
for each row execute function set_updated_at();

create trigger library_sections_set_updated_at
before update on library_sections
for each row execute function set_updated_at();

create trigger library_metrics_set_updated_at
before update on library_metrics
for each row execute function set_updated_at();

create trigger library_recommendations_set_updated_at
before update on library_recommendations
for each row execute function set_updated_at();

create trigger library_actions_set_updated_at
before update on library_actions
for each row execute function set_updated_at();

alter table library_axes enable row level security;
alter table library_sections enable row level security;
alter table library_metrics enable row level security;
alter table library_recommendations enable row level security;
alter table library_actions enable row level security;

create policy "library_axes read staff"
on library_axes for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'analyst')
  )
);

create policy "library_axes write admin"
on library_axes for all
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

create policy "library_sections read staff"
on library_sections for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'analyst')
  )
);

create policy "library_sections write admin"
on library_sections for all
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

create policy "library_metrics read staff"
on library_metrics for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'analyst')
  )
);

create policy "library_metrics write admin"
on library_metrics for all
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

create policy "library_recommendations read staff"
on library_recommendations for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'analyst')
  )
);

create policy "library_recommendations write admin"
on library_recommendations for all
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

create policy "library_actions read staff"
on library_actions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin', 'analyst')
  )
);

create policy "library_actions write admin"
on library_actions for all
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
