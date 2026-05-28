-- 0030_v2_data_normalization.sql
-- Fase 3 / Bloco 1 (dados): normaliza payloads legados para contrato V2
-- sem alterar tipos/enums ainda.

-- 1) JSON inline de metrica: yes_no_partial -> yes_no
update public.question_library_binding
set metric = jsonb_set(metric, '{answerType}', '"yes_no"'::jsonb, true)
where metric is not null
  and metric->>'answerType' = 'yes_no_partial';

update public.form_question_library_snapshot
set metric = jsonb_set(metric, '{answerType}', '"yes_no"'::jsonb, true)
where metric is not null
  and metric->>'answerType' = 'yes_no_partial';

-- 2) bindings: chave legado "parcialmente" -> "nao_se_aplica"
update public.question_library_binding
set bindings =
  (bindings - 'parcialmente') ||
  case
    when bindings ? 'nao_se_aplica' then jsonb_build_object('nao_se_aplica', bindings->'nao_se_aplica')
    else jsonb_build_object('nao_se_aplica', bindings->'parcialmente')
  end
where bindings ? 'parcialmente';

update public.form_question_library_snapshot
set bindings =
  (bindings - 'parcialmente') ||
  case
    when bindings ? 'nao_se_aplica' then jsonb_build_object('nao_se_aplica', bindings->'nao_se_aplica')
    else jsonb_build_object('nao_se_aplica', bindings->'parcialmente')
  end
where bindings ? 'parcialmente';

-- 3) response_mapping: partialMax/partialBelow -> notApplicableMax/notApplicableBelow
update public.question_library_binding
set response_mapping = jsonb_set(
  response_mapping,
  '{scaleBands}',
  ((response_mapping->'scaleBands') - 'partialMax') ||
  jsonb_build_object(
    'notApplicableMax',
    coalesce(response_mapping->'scaleBands'->'notApplicableMax', response_mapping->'scaleBands'->'partialMax')
  ),
  true
)
where response_mapping ? 'scaleBands'
  and (response_mapping->'scaleBands' ? 'partialMax');

update public.form_question_library_snapshot
set response_mapping = jsonb_set(
  response_mapping,
  '{scaleBands}',
  ((response_mapping->'scaleBands') - 'partialMax') ||
  jsonb_build_object(
    'notApplicableMax',
    coalesce(response_mapping->'scaleBands'->'notApplicableMax', response_mapping->'scaleBands'->'partialMax')
  ),
  true
)
where response_mapping ? 'scaleBands'
  and (response_mapping->'scaleBands' ? 'partialMax');

update public.question_library_binding
set response_mapping = jsonb_set(
  response_mapping,
  '{numericThresholds}',
  ((response_mapping->'numericThresholds') - 'partialBelow') ||
  jsonb_build_object(
    'notApplicableBelow',
    coalesce(
      response_mapping->'numericThresholds'->'notApplicableBelow',
      response_mapping->'numericThresholds'->'partialBelow'
    )
  ),
  true
)
where response_mapping ? 'numericThresholds'
  and (response_mapping->'numericThresholds' ? 'partialBelow');

update public.form_question_library_snapshot
set response_mapping = jsonb_set(
  response_mapping,
  '{numericThresholds}',
  ((response_mapping->'numericThresholds') - 'partialBelow') ||
  jsonb_build_object(
    'notApplicableBelow',
    coalesce(
      response_mapping->'numericThresholds'->'notApplicableBelow',
      response_mapping->'numericThresholds'->'partialBelow'
    )
  ),
  true
)
where response_mapping ? 'numericThresholds'
  and (response_mapping->'numericThresholds' ? 'partialBelow');

-- 4) recommendation type legado -> tipo suportado
update public.library_recommendations
set tipo = 'nao_implementacao'
where tipo = 'implementacao_parcial';

-- 5) notas de supervisao: papel legado -> admin (idempotente)
-- Em bases que ainda nao possuem esse modulo/tabela, ignora sem falhar.
do $$
begin
  if to_regclass('public.action_plan_supervision_notes') is not null then
    update public.action_plan_supervision_notes
    set author_role = 'admin'
    where author_role = 'analyst';
  end if;
end $$;
