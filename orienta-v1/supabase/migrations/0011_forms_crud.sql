-- 0011_forms_crud.sql
-- Suporte a CRUD admin de formularios e perguntas:
--   * `form_questions.order_index` para reordenacao persistida por formulario.
--   * `forms.archived_at` para soft-archive sem mudar o enum de estados.
--   * Tornar campos legacy de `questions` opcionais: com o modelo inline-metric
--     (biblioteca inline por vinculo), `section_id`, `recommendation_text` e
--     `priority` deixaram de ser obrigatorios para perguntas novas. Registros
--     antigos permanecem intactos.

alter table form_questions
  add column if not exists order_index integer not null default 0;

-- Backfill: preserva uma ordem estavel usando o proprio uuid da pergunta.
-- Nao e "a ordem ideal" — e apenas determinista. Admin pode reordenar depois.
with ordered as (
  select
    fq.form_id,
    fq.question_id,
    (row_number() over (
      partition by fq.form_id order by fq.question_id
    ) - 1)::integer as idx
  from form_questions fq
)
update form_questions fq
set order_index = ordered.idx
from ordered
where fq.form_id = ordered.form_id
  and fq.question_id = ordered.question_id;

create index if not exists form_questions_order_idx
  on form_questions (form_id, order_index);

alter table forms
  add column if not exists archived_at timestamptz null;

create index if not exists forms_archived_at_idx
  on forms (archived_at);

alter table questions
  alter column section_id drop not null,
  alter column recommendation_text drop not null,
  alter column priority drop not null;
