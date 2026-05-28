-- 0033_v2_guardrails.sql
-- Fase 3 / Bloco 3 (Guardrails): bloqueia regressao de vocabulário legado no banco.

-- Guardrails em question_library_binding
do $$
begin
  if to_regclass('public.question_library_binding') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'question_library_binding_metric_answer_type_v2_check'
        and conrelid = 'public.question_library_binding'::regclass
    ) then
      alter table public.question_library_binding
        add constraint question_library_binding_metric_answer_type_v2_check
        check (
          metric is null
          or coalesce(metric->>'answerType', '') <> 'yes_no_partial'
        );
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'question_library_binding_bindings_v2_check'
        and conrelid = 'public.question_library_binding'::regclass
    ) then
      alter table public.question_library_binding
        add constraint question_library_binding_bindings_v2_check
        check (
          bindings is null
          or not (bindings ? 'parcialmente')
        );
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'question_library_binding_response_mapping_v2_check'
        and conrelid = 'public.question_library_binding'::regclass
    ) then
      alter table public.question_library_binding
        add constraint question_library_binding_response_mapping_v2_check
        check (
          response_mapping is null
          or (
            response_mapping::text not ilike '%partialMax%'
            and response_mapping::text not ilike '%partialBelow%'
          )
        );
    end if;
  end if;
end $$;

-- Guardrails em form_question_library_snapshot
do $$
begin
  if to_regclass('public.form_question_library_snapshot') is not null then
    if not exists (
      select 1
      from pg_constraint
      where conname = 'form_question_library_snapshot_metric_answer_type_v2_check'
        and conrelid = 'public.form_question_library_snapshot'::regclass
    ) then
      alter table public.form_question_library_snapshot
        add constraint form_question_library_snapshot_metric_answer_type_v2_check
        check (
          metric is null
          or coalesce(metric->>'answerType', '') <> 'yes_no_partial'
        );
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'form_question_library_snapshot_bindings_v2_check'
        and conrelid = 'public.form_question_library_snapshot'::regclass
    ) then
      alter table public.form_question_library_snapshot
        add constraint form_question_library_snapshot_bindings_v2_check
        check (
          bindings is null
          or not (bindings ? 'parcialmente')
        );
    end if;

    if not exists (
      select 1
      from pg_constraint
      where conname = 'form_question_library_snapshot_response_mapping_v2_check'
        and conrelid = 'public.form_question_library_snapshot'::regclass
    ) then
      alter table public.form_question_library_snapshot
        add constraint form_question_library_snapshot_response_mapping_v2_check
        check (
          response_mapping is null
          or (
            response_mapping::text not ilike '%partialMax%'
            and response_mapping::text not ilike '%partialBelow%'
          )
        );
    end if;
  end if;
end $$;
