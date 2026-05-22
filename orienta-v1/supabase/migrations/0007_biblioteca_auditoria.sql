-- Biblioteca Geral V1 - trilha de auditoria estruturada
--
-- Persiste eventos de ciclo de vida, binding, snapshot, excecoes e
-- efetividade para reconstituicao historica independente dos logs.

create table if not exists library_audit_events (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text not null,
  item_type text,
  item_id uuid,
  actor_user_id uuid,
  organization_id uuid,
  from_status text,
  to_status text,
  from_version text,
  to_version text,
  justification text,
  diff jsonb,
  hash text,
  request_id text,
  extra jsonb,
  created_at timestamptz not null default now()
);

create index if not exists library_audit_events_item_idx
  on library_audit_events(item_type, item_id, created_at desc);
create index if not exists library_audit_events_actor_idx
  on library_audit_events(actor_user_id, created_at desc);
create index if not exists library_audit_events_entity_idx
  on library_audit_events(entity, created_at desc);
create index if not exists library_audit_events_request_idx
  on library_audit_events(request_id);

alter table library_audit_events enable row level security;

drop policy if exists "library_audit_events read staff" on library_audit_events;
create policy "library_audit_events read staff"
on library_audit_events for select
to authenticated
using (
  exists (
    select 1 from profiles p
    where p.user_id = auth.uid() and p.role in ('admin','analyst')
  )
);

-- Insercao e feita exclusivamente pelo service_role (backend), sem
-- policy de insert para usuarios finais (evita tampering).
