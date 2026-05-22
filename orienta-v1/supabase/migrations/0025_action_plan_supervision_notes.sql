-- 0025_action_plan_supervision_notes.sql
-- Feed institucional de supervisão do plano de ação (admin/analista).

create table if not exists action_plan_supervision_notes (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references recommendations(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  author_role text not null check (author_role in ('admin', 'analyst')),
  note_type text not null check (note_type in (
    'comment',
    'adjustment_request',
    'opinion',
    'approval',
    'pending',
    'forwarding'
  )),
  body text not null check (char_length(trim(body)) >= 1 and char_length(body) <= 4000),
  created_at timestamptz not null default now()
);

create index if not exists action_plan_supervision_notes_rec_idx
  on action_plan_supervision_notes (recommendation_id, created_at desc);

alter table action_plan_supervision_notes enable row level security;

create policy "action_plan_supervision_notes read scoped"
on action_plan_supervision_notes for select
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
  or exists (
    select 1
    from recommendations r
    join profiles p on p.user_id = auth.uid()
    where r.id = action_plan_supervision_notes.recommendation_id
      and r.organization_id = p.organization_id
      and p.role in ('analyst', 'admin')
  )
);
