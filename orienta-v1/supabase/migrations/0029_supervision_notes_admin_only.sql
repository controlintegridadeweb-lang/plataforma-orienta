-- Remove legado do perfil analyst em notas de supervisao do plano de acao.

update action_plan_supervision_notes
set author_role = 'admin'
where author_role = 'analyst';

alter table action_plan_supervision_notes
  drop constraint if exists action_plan_supervision_notes_author_role_check;

alter table action_plan_supervision_notes
  add constraint action_plan_supervision_notes_author_role_check
  check (author_role in ('admin'));

drop policy if exists "action_plan_supervision_notes read scoped"
  on action_plan_supervision_notes;

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
      and p.role = 'admin'
  )
);
