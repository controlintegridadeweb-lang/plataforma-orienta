-- Plano de acao — vinculo obrigatorio ao formulario + eixo estrutural por acao.

alter table action_plans
  add column if not exists form_id uuid references forms(id) on delete cascade,
  add column if not exists axis_id uuid references axes(id) on delete restrict;

update action_plans ap
set form_id = r.form_id
from recommendations r
where r.id = ap.recommendation_id
  and ap.form_id is null;

update action_plans ap
set axis_id = coalesce(
  s.axis_id,
  (
    select a.id
    from axes a
    join library_axes la on lower(trim(la.name)) = lower(trim(a.name))
    join question_library_binding qlb on qlb.axis_id = la.id
    where qlb.question_id = r.question_id
    limit 1
  )
)
from recommendations r
join questions q on q.id = r.question_id
left join sections s on s.id = q.section_id
where r.id = ap.recommendation_id
  and ap.axis_id is null;

alter table action_plans
  alter column form_id set not null,
  alter column axis_id set not null;

create index if not exists action_plans_form_id_idx on action_plans(form_id);
create index if not exists action_plans_axis_id_idx on action_plans(axis_id);
create index if not exists action_plans_form_axis_idx on action_plans(form_id, axis_id);
create index if not exists action_plans_recommendation_id_idx on action_plans(recommendation_id);

create or replace function action_plans_enforce_form_axis()
returns trigger
language plpgsql as $$
declare
  rec_form_id uuid;
  rec_question_id uuid;
  rec_section_id uuid;
  resolved_axis uuid;
begin
  select r.form_id, r.question_id, q.section_id
  into rec_form_id, rec_question_id, rec_section_id
  from recommendations r
  join questions q on q.id = r.question_id
  where r.id = new.recommendation_id;

  if rec_form_id is null then
    raise exception 'recommendation_id invalido';
  end if;

  new.form_id := rec_form_id;

  if new.axis_id is null then
    select s.axis_id into resolved_axis
    from sections s
    where s.id = rec_section_id;

    if resolved_axis is null then
      select a.id into resolved_axis
      from axes a
      join library_axes la on lower(trim(la.name)) = lower(trim(a.name))
      join question_library_binding qlb on qlb.axis_id = la.id
      where qlb.question_id = rec_question_id
      limit 1;
    end if;

    new.axis_id := resolved_axis;
  end if;

  if new.axis_id is null then
    raise exception 'Nao foi possivel resolver axis_id para a recomendacao %', new.recommendation_id;
  end if;

  return new;
end;
$$;

drop trigger if exists action_plans_enforce_form_axis_trg on action_plans;
create trigger action_plans_enforce_form_axis_trg
before insert or update of recommendation_id, axis_id on action_plans
for each row execute function action_plans_enforce_form_axis();
