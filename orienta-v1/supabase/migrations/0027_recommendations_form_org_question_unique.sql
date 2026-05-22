-- Uma recomendacao por (formulario, orgao, pergunta) — habilita upsert sem apagar planos de acao.

delete from recommendations r1
using recommendations r2
where r1.form_id = r2.form_id
  and r1.organization_id = r2.organization_id
  and r1.question_id = r2.question_id
  and r1.created_at > r2.created_at;

create unique index if not exists recommendations_form_org_question_uidx
  on recommendations (form_id, organization_id, question_id);
