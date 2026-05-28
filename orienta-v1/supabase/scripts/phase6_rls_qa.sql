-- PHASE 6 - RLS QA baseline
-- Execute no projeto alvo apos migrations V2.

-- 1) Policies legadas por role antigo.
select schemaname, tablename, policyname, roles, cmd
from pg_policies
where schemaname = 'public'
  and (
    coalesce(qual, '') ~* '\manalysts?\M'
    or coalesce(with_check, '') ~* '\manalysts?\M'
    or policyname ~* '\manalysts?\M'
  )
order by schemaname, tablename, policyname;

-- 2) Constraints de guardrail V2 (esperado: 6 linhas).
select conrelid::regclass as table_name, conname
from pg_constraint
where conname in (
  'question_library_binding_metric_answer_type_v2_check',
  'question_library_binding_bindings_v2_check',
  'question_library_binding_response_mapping_v2_check',
  'form_question_library_snapshot_metric_answer_type_v2_check',
  'form_question_library_snapshot_bindings_v2_check',
  'form_question_library_snapshot_response_mapping_v2_check'
)
order by conname;

-- 3) Enums V2 sem labels legados (esperado: 0 linhas).
select t.typname, e.enumlabel
from pg_type t
join pg_enum e on e.enumtypid = t.oid
where (t.typname = 'answer_value' and e.enumlabel in ('partial'))
   or (t.typname = 'validation_status' and e.enumlabel in ('valid','invalid','partially_valid','complementation_requested','waived'))
   or (t.typname = 'library_metric_answer_type' and e.enumlabel in ('yes_no_partial'))
   or (t.typname = 'library_recommendation_type' and e.enumlabel in ('implementacao_parcial'))
order by t.typname, e.enumlabel;
