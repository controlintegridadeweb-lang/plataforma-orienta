-- Metrica inline por pergunta: deixa de ser entidade reutilizavel da Biblioteca
-- Geral e passa a viver dentro do vinculo de cada pergunta (question_library_binding)
-- e em cada snapshot de versao de formulario (form_question_library_snapshot).
--
-- Formato esperado do JSON:
--   {
--     "name": "Percentual de cobertura de controles",
--     "description": "...",
--     "answerType": "yes_no" | "yes_no_partial" | "scale" | "numeric" | "text",
--     "interpretation": "higher_better" | "lower_better" | "qualitative",
--     "severityHint": "high" | "medium" | "low" | null
--   }
--
-- Colunas legadas `metric_id` e `metric_version_id` permanecem nullables para
-- leitura de dados historicos. Novos escritas em question_library_binding
-- passam a preencher apenas a coluna `metric`.

alter table question_library_binding
  add column if not exists metric jsonb not null default '{}';

alter table form_question_library_snapshot
  add column if not exists metric jsonb not null default '{}';

-- Data migration best-effort: copia metadados da library_metrics publicada para
-- o campo `metric` inline, somente quando ainda esta vazio. Usa os campos
-- canonicos da tabela de metricas (name/description/answer_type/interpretation/severity_hint).

update question_library_binding qb
set metric = jsonb_strip_nulls(jsonb_build_object(
  'name', lm.name,
  'description', lm.description,
  'answerType', lm.answer_type::text,
  'interpretation', lm.interpretation::text,
  'severityHint', lm.severity_hint::text
))
from library_metrics lm
where qb.metric_id is not null
  and qb.metric_id = lm.id
  and (qb.metric is null or qb.metric = '{}'::jsonb);

-- Para snapshots historicos usamos o payload gravado em library_item_versions
-- quando existir; caso contrario caimos para a linha corrente de library_metrics.
-- Enums de library_metrics sao convertidos para text para coalesce com os valores
-- vindos de payload->> (que ja sao text).
update form_question_library_snapshot fs
set metric = jsonb_strip_nulls(jsonb_build_object(
  'name', coalesce(liv.payload->>'name', lm.name),
  'description', coalesce(liv.payload->>'description', lm.description),
  'answerType', coalesce(liv.payload->>'answerType', lm.answer_type::text),
  'interpretation', coalesce(liv.payload->>'interpretation', lm.interpretation::text),
  'severityHint', coalesce(liv.payload->>'severityHint', lm.severity_hint::text)
))
from library_item_versions liv
  full outer join library_metrics lm on lm.id = liv.item_id
where (fs.metric is null or fs.metric = '{}'::jsonb)
  and fs.metric_version_id is not null
  and liv.id = fs.metric_version_id
  and liv.item_type = 'metric';
