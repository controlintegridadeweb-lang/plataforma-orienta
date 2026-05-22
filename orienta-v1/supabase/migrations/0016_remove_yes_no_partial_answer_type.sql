-- Converte o tipo de resposta legado yes_no_partial (Sim/Nao/Parcialmente) para yes_no.
-- O valor do enum em library_metric_answer_type permanece no Postgres para compat.,
-- mas deixa de ser usado pela aplicacao.

update library_metrics
set answer_type = 'yes_no'::library_metric_answer_type
where answer_type = 'yes_no_partial'::library_metric_answer_type;

update question_library_binding
set metric = jsonb_set(metric, '{answerType}', '"yes_no"', true)
where metric ? 'answerType'
  and metric->>'answerType' = 'yes_no_partial';

update form_question_library_snapshot
set metric = jsonb_set(metric, '{answerType}', '"yes_no"', true)
where metric ? 'answerType'
  and metric->>'answerType' = 'yes_no_partial';
