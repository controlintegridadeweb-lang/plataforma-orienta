-- 0026_question_waivers_per_question.sql
-- Dispensa institucional por (organização, pergunta) — não por formulário.
-- A mesma pergunta dispensada para um órgão vale em qualquer formulário que a inclua.

-- Mantém apenas o registro mais recente quando havia duplicata por form.
delete from question_organization_waivers w
using (
  select ctid,
    row_number() over (
      partition by organization_id, question_id
      order by waived_at desc nulls last
    ) as rn
  from question_organization_waivers
) ranked
where w.ctid = ranked.ctid
  and ranked.rn > 1;

alter table question_organization_waivers
  drop constraint if exists question_organization_waivers_pkey;

drop index if exists question_organization_waivers_form_org_idx;

alter table question_organization_waivers
  drop column if exists form_id;

alter table question_organization_waivers
  add primary key (organization_id, question_id);

create index if not exists question_organization_waivers_org_idx
  on question_organization_waivers (organization_id);
