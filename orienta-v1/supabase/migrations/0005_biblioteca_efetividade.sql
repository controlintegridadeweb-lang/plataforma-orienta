-- Biblioteca Geral V1 — efetividade e excecoes institucionais.

-- ============================================================
-- library_effectiveness_snapshots
-- ============================================================

create table if not exists library_effectiveness_snapshots (
  id uuid primary key default gen_random_uuid(),
  period_start date not null,
  period_end date not null,
  item_type text not null check (item_type in ('axis','section','metric','recommendation','action')),
  item_id uuid not null,
  total_triggers integer not null default 0,
  accepted integer not null default 0,
  rejected integer not null default 0,
  plan_conversions integer not null default 0,
  average_confidence numeric(5,2),
  payload jsonb not null default '{}',
  captured_at timestamptz not null default now()
);

create index if not exists library_effectiveness_item_idx
  on library_effectiveness_snapshots(item_type, item_id);
create index if not exists library_effectiveness_period_idx
  on library_effectiveness_snapshots(period_start, period_end);

alter table library_effectiveness_snapshots enable row level security;

drop policy if exists "library_effectiveness read staff" on library_effectiveness_snapshots;
create policy "library_effectiveness read staff"
on library_effectiveness_snapshots for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "library_effectiveness insert admin" on library_effectiveness_snapshots;
create policy "library_effectiveness insert admin"
on library_effectiveness_snapshots for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  )
);

-- ============================================================
-- recommendation_exceptions (excecoes institucionais)
-- ============================================================

create table if not exists recommendation_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  recommendation_id uuid not null references library_recommendations(id) on delete restrict,
  question_id uuid references questions(id) on delete set null,
  motivo text not null,
  prazo date,
  status text not null check (status in ('requested','approved','rejected','expired')) default 'requested',
  requested_by uuid,
  requested_at timestamptz not null default now(),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists recommendation_exceptions_org_idx
  on recommendation_exceptions(organization_id);
create index if not exists recommendation_exceptions_rec_idx
  on recommendation_exceptions(recommendation_id);
create index if not exists recommendation_exceptions_status_idx
  on recommendation_exceptions(status);

drop trigger if exists recommendation_exceptions_set_updated_at on recommendation_exceptions;
create trigger recommendation_exceptions_set_updated_at
before update on recommendation_exceptions
for each row execute function set_updated_at();

alter table recommendation_exceptions enable row level security;

drop policy if exists "recommendation_exceptions read staff" on recommendation_exceptions;
create policy "recommendation_exceptions read staff"
on recommendation_exceptions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

drop policy if exists "recommendation_exceptions read respondent" on recommendation_exceptions;
create policy "recommendation_exceptions read respondent"
on recommendation_exceptions for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid()
      and p.role = 'respondent'
      and p.organization_id = recommendation_exceptions.organization_id
  )
);

drop policy if exists "recommendation_exceptions write respondent" on recommendation_exceptions;
create policy "recommendation_exceptions write respondent"
on recommendation_exceptions for insert
to authenticated
with check (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid()
      and p.role = 'respondent'
      and p.organization_id = recommendation_exceptions.organization_id
  )
);

drop policy if exists "recommendation_exceptions update admin" on recommendation_exceptions;
create policy "recommendation_exceptions update admin"
on recommendation_exceptions for update
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
