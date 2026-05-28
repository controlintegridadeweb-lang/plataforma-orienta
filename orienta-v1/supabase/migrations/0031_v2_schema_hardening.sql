-- 0031_v2_schema_hardening.sql
-- Fase 3 / Bloco 1 (estrutura): endurece schema/enums para contrato V2.

-- 1) answer_value: ('yes','no','partial') -> ('yes','no','not_applicable')
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'answer_value'
      and e.enumlabel = 'partial'
  ) then
    alter type public.answer_value rename to answer_value_old;
    create type public.answer_value as enum ('yes', 'no', 'not_applicable');

    alter table public.responses
      alter column answer type public.answer_value
      using (
        case
          when answer::text = 'partial' then 'not_applicable'
          else answer::text
        end
      )::public.answer_value;

    drop type public.answer_value_old;
  end if;
end $$;

-- 2) validation_status:
-- ('pending','valid','invalid','partially_valid','complementation_requested','waived')
-- -> ('pending','approved','invalidated','adjustment_requested')
do $$
declare
  dependent_view record;
  rewritten_definition text;
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'validation_status'
      and e.enumlabel in ('valid', 'invalid', 'partially_valid', 'complementation_requested', 'waived')
  ) then
    -- Constraint legado pode ficar tipado no enum antigo e bloquear ALTER TYPE.
    alter table public.evidence_validations
      drop constraint if exists evidence_validations_check;

    alter table public.evidence_validations
      drop constraint if exists evidence_validations_justification_check;

    -- Views que dependem de evidence_validations.status bloqueiam o alter type.
    -- Capturamos definicao, removemos e recriamos ao final.
    create temporary table if not exists _tmp_validation_status_dependent_views (
      schema_name text not null,
      view_name text not null,
      view_definition text not null
    ) on commit drop;

    truncate _tmp_validation_status_dependent_views;

    insert into _tmp_validation_status_dependent_views (schema_name, view_name, view_definition)
    select distinct
      n.nspname,
      c.relname,
      pg_get_viewdef(c.oid, true)
    from pg_depend d
    join pg_rewrite r
      on r.oid = d.objid
    join pg_class c
      on c.oid = r.ev_class
     and c.relkind = 'v'
    join pg_namespace n
      on n.oid = c.relnamespace
    where d.refobjid = 'public.evidence_validations'::regclass
      and d.refobjsubid = (
        select a.attnum
        from pg_attribute a
        where a.attrelid = 'public.evidence_validations'::regclass
          and a.attname = 'status'
          and not a.attisdropped
      );

    for dependent_view in
      select schema_name, view_name
      from _tmp_validation_status_dependent_views
    loop
      execute format(
        'drop view if exists %I.%I',
        dependent_view.schema_name,
        dependent_view.view_name
      );
    end loop;

    alter type public.validation_status rename to validation_status_old;
    create type public.validation_status as enum ('pending', 'approved', 'invalidated', 'adjustment_requested');

    alter table public.evidence_validations
      alter column status type public.validation_status
      using (
        case
          when status::text = 'pending' then 'pending'
          when status::text = 'valid' then 'approved'
          when status::text = 'waived' then 'approved'
          when status::text = 'complementation_requested' then 'adjustment_requested'
          when status::text = 'invalid' then 'invalidated'
          when status::text = 'partially_valid' then 'invalidated'
          else 'pending'
        end
      )::public.validation_status;

    drop type public.validation_status_old;

    for dependent_view in
      select schema_name, view_name, view_definition
      from _tmp_validation_status_dependent_views
    loop
      rewritten_definition := dependent_view.view_definition;
      rewritten_definition := regexp_replace(rewritten_definition, '\mcomplementation_requested\M', 'adjustment_requested', 'g');
      rewritten_definition := regexp_replace(rewritten_definition, '\mpartially_valid\M', 'invalidated', 'g');
      rewritten_definition := regexp_replace(rewritten_definition, '\minvalid\M', 'invalidated', 'g');
      rewritten_definition := regexp_replace(rewritten_definition, '\mwaived\M', 'approved', 'g');
      rewritten_definition := regexp_replace(rewritten_definition, '\mvalid\M', 'approved', 'g');

      execute format(
        'create or replace view %I.%I as %s',
        dependent_view.schema_name,
        dependent_view.view_name,
        rewritten_definition
      );
    end loop;
  end if;
end $$;

alter table public.evidence_validations
  drop constraint if exists evidence_validations_check;

alter table public.evidence_validations
  add constraint evidence_validations_justification_check
  check (
    (status in ('invalidated', 'adjustment_requested') and justification is not null)
    or (status not in ('invalidated', 'adjustment_requested'))
  );

-- 3) library_metric_answer_type: remove yes_no_partial
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'library_metric_answer_type'
      and e.enumlabel = 'yes_no_partial'
  ) then
    alter type public.library_metric_answer_type rename to library_metric_answer_type_old;
    create type public.library_metric_answer_type as enum ('yes_no', 'scale', 'numeric', 'text');

    alter table public.library_metrics
      alter column answer_type type public.library_metric_answer_type
      using (
        case
          when answer_type::text = 'yes_no_partial' then 'yes_no'
          else answer_type::text
        end
      )::public.library_metric_answer_type;

    drop type public.library_metric_answer_type_old;
  end if;
end $$;

-- 4) library_recommendation_type: remove implementacao_parcial
do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'library_recommendation_type'
      and e.enumlabel = 'implementacao_parcial'
  ) then
    alter table public.library_recommendations
      alter column tipo drop default;

    alter type public.library_recommendation_type rename to library_recommendation_type_old;
    create type public.library_recommendation_type as enum (
      'nao_implementacao',
      'ausencia_evidencia',
      'evidencia_insuficiente'
    );

    alter table public.library_recommendations
      alter column tipo type public.library_recommendation_type
      using (
        case
          when tipo::text = 'implementacao_parcial' then 'nao_implementacao'
          else tipo::text
        end
      )::public.library_recommendation_type;

    alter table public.library_recommendations
      alter column tipo set default 'nao_implementacao'::public.library_recommendation_type;

    drop type public.library_recommendation_type_old;
  end if;
end $$;
