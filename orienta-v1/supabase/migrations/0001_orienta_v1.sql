create extension if not exists pgcrypto;

create type app_user_role as enum ('admin', 'analyst', 'respondent');
create type workflow_state as enum (
  'draft',
  'submitted',
  'under_review',
  'complementation_requested',
  'resubmitted',
  'consolidated',
  'closed'
);
create type validation_status as enum (
  'pending',
  'valid',
  'invalid',
  'partially_valid',
  'complementation_requested',
  'waived'
);
create type answer_value as enum ('yes', 'no', 'partial');

create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role app_user_role not null,
  organization_id uuid references organizations(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists axes (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name in ('Governanca', 'Ambiental', 'Social'))
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  axis_id uuid not null references axes(id) on delete restrict,
  name text not null,
  unique (axis_id, name)
);

create table if not exists forms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version integer not null,
  state workflow_state not null default 'draft',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (name, version)
);

create table if not exists questions (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references sections(id) on delete restrict,
  prompt text not null,
  requires_evidence boolean not null default false,
  fami_enabled boolean not null default true,
  applies_to_respondent boolean not null default true,
  recommendation_text text not null,
  priority text not null check (priority in ('high', 'medium', 'low'))
);

create table if not exists form_questions (
  form_id uuid not null references forms(id) on delete cascade,
  question_id uuid not null references questions(id) on delete restrict,
  primary key (form_id, question_id)
);

create table if not exists responses (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  answer answer_value not null,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (form_id, organization_id, question_id)
);

create table if not exists evidences (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null references responses(id) on delete cascade,
  storage_path text,
  external_link text,
  exception_reason text,
  title text not null,
  description text not null,
  evidence_type text not null,
  submitted_by uuid not null references auth.users(id),
  submitted_at timestamptz not null default now(),
  check (
    (storage_path is not null and external_link is null)
    or (storage_path is null and external_link is not null and exception_reason is not null)
  )
);

create table if not exists evidence_validations (
  id uuid primary key default gen_random_uuid(),
  evidence_id uuid not null references evidences(id) on delete cascade,
  status validation_status not null,
  justification text,
  validated_by uuid not null references auth.users(id),
  validated_at timestamptz not null default now(),
  check ((status = 'waived' and justification is not null) or status <> 'waived')
);

create table if not exists recommendations (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  question_id uuid not null references questions(id) on delete cascade,
  recommendation_type text not null,
  original_text text not null,
  current_text text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists action_plans (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  action_text text not null,
  due_date date not null,
  responsible_sector text not null,
  responsible_name text not null,
  priority text not null check (priority in ('high', 'medium', 'low')),
  status text not null check (status in ('to_implement', 'in_progress', 'completed', 'cancelled')),
  observations text,
  updated_at timestamptz not null default now()
);

create table if not exists fami_results (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  processing_version integer not null,
  scope_type text not null check (scope_type in ('section', 'axis', 'global')),
  scope_id uuid,
  points_obtained numeric(10,2) not null,
  points_possible numeric(10,2) not null,
  percentage numeric(5,2) not null,
  maturity_level smallint not null check (maturity_level between 1 and 5),
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  form_id uuid not null references forms(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  processing_version integer not null,
  generated_by uuid not null references auth.users(id),
  file_path text not null,
  generated_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id),
  event_type text not null,
  table_name text,
  record_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger responses_set_updated_at
before update on responses
for each row execute function set_updated_at();

create trigger recommendations_set_updated_at
before update on recommendations
for each row execute function set_updated_at();

create or replace function audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into audit_logs (actor_id, event_type, table_name, record_id, old_value, new_value)
  values (
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    to_jsonb(old),
    to_jsonb(new)
  );
  return coalesce(new, old);
end;
$$;

create trigger audit_responses
after insert or update or delete on responses
for each row execute function audit_row_change();

create trigger audit_validations
after insert or update or delete on evidence_validations
for each row execute function audit_row_change();

create trigger audit_action_plans
after insert or update or delete on action_plans
for each row execute function audit_row_change();

alter table organizations enable row level security;
alter table profiles enable row level security;
alter table forms enable row level security;
alter table responses enable row level security;
alter table evidences enable row level security;
alter table evidence_validations enable row level security;
alter table recommendations enable row level security;
alter table action_plans enable row level security;
alter table fami_results enable row level security;
alter table reports enable row level security;
alter table audit_logs enable row level security;

create policy "profiles self read"
on profiles for select
to authenticated
using (user_id = auth.uid());

create policy "forms read all authenticated"
on forms for select
to authenticated
using (true);

create policy "responses by org members"
on responses for all
to authenticated
using (
  organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
)
with check (
  organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
);

create policy "evidences by org members"
on evidences for all
to authenticated
using (
  response_id in (
    select r.id from responses r
    where r.organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  )
)
with check (
  response_id in (
    select r.id from responses r
    where r.organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  )
);

create policy "analyst validation write"
on evidence_validations for all
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
)
with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);

create policy "recommendation read by org"
on recommendations for select
to authenticated
using (
  organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);

create policy "plans read by org or analyst"
on action_plans for select
to authenticated
using (
  recommendation_id in (
    select rec.id
    from recommendations rec
    where rec.organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  )
  or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);

create policy "fami read by org or analyst"
on fami_results for select
to authenticated
using (
  organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
  or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);

create policy "audit logs admin analyst read"
on audit_logs for select
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('admin', 'analyst'))
);
