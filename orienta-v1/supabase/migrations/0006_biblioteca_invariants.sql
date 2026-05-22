-- Biblioteca Geral V1 - invariantes criticas e escopo de excecoes.
-- Este arquivo endurece regras que antes existiam apenas em docs/codigo.
--
-- Cobre:
--   1) `code` imutavel apos primeira publicacao (status != 'draft').
--   2) `ordem` nao negativa em library_axes / library_sections.
--   3) `coverage_score` entre 0 e 100 em question_library_binding.
--   4) Secao so referencia eixo nao arquivado.
--   5) RLS restrita por organizacao em recommendation_exceptions para
--      respondent/analyst (admin mantem acesso cross-org).

-- ============================================================
-- 1) Trigger: bloquear alteracao de `code` apos primeira publicacao
-- ============================================================

create or replace function library_block_code_change_after_publish()
returns trigger
language plpgsql
as $$
begin
  if new.code is distinct from old.code and old.status <> 'draft' then
    raise exception
      'code de item % nao pode ser alterado apos primeira publicacao (status atual: %).',
      old.id, old.status
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

do $$
declare
  target text;
  library_tables text[] := array[
    'library_axes',
    'library_sections',
    'library_metrics',
    'library_recommendations',
    'library_actions'
  ];
begin
  foreach target in array library_tables loop
    execute format(
      'drop trigger if exists %I_block_code_change on %I',
      target || '_block_code_change', target
    );
    execute format(
      'create trigger %I_block_code_change ' ||
      'before update on %I ' ||
      'for each row execute function library_block_code_change_after_publish()',
      target || '_block_code_change', target
    );
  end loop;
end;
$$;

-- ============================================================
-- 2) Constraints: ordem >= 0 em eixos e secoes
-- ============================================================

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'library_axes_ordem_non_negative'
  ) then
    alter table library_axes
      add constraint library_axes_ordem_non_negative check (ordem >= 0);
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'library_sections_ordem_non_negative'
  ) then
    alter table library_sections
      add constraint library_sections_ordem_non_negative check (ordem >= 0);
  end if;
end $$;

-- ============================================================
-- 3) Constraint: coverage_score em [0,100]
-- ============================================================

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'question_library_binding_coverage_score_range'
  ) then
    alter table question_library_binding
      add constraint question_library_binding_coverage_score_range
      check (coverage_score >= 0 and coverage_score <= 100);
  end if;
end $$;

-- ============================================================
-- 4) Trigger: secao nao pode apontar para eixo `archived`
-- ============================================================

create or replace function library_section_requires_active_axis()
returns trigger
language plpgsql
as $$
declare
  axis_status text;
begin
  if new.axis_id is null then
    return new;
  end if;
  select status into axis_status from library_axes where id = new.axis_id;
  if axis_status is null then
    raise exception 'axis_id % nao existe em library_axes', new.axis_id
      using errcode = 'foreign_key_violation';
  end if;
  if axis_status = 'archived' then
    raise exception
      'Secao nao pode referenciar eixo archived (axis_id: %).',
      new.axis_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists library_sections_axis_active_check on library_sections;
create trigger library_sections_axis_active_check
before insert or update of axis_id on library_sections
for each row execute function library_section_requires_active_axis();

-- ============================================================
-- 5) Indices compostos para acesso a versoes publicadas
-- ============================================================

create index if not exists library_item_versions_latest_idx
  on library_item_versions(item_type, item_id, published_at desc);

create index if not exists library_item_versions_item_id_idx
  on library_item_versions(item_id);

-- ============================================================
-- 6) RLS de recommendation_exceptions com escopo por organizacao
-- ============================================================
-- Observacao: esta politica convive com o fluxo administrativo via
-- service_role. service_role ignora RLS por padrao.

do $$ begin
  if exists (
    select 1 from information_schema.tables
    where table_name = 'recommendation_exceptions'
  ) then
    execute 'alter table recommendation_exceptions enable row level security';

    execute 'drop policy if exists "recommendation_exceptions read scoped" on recommendation_exceptions';
    execute $p$
      create policy "recommendation_exceptions read scoped"
      on recommendation_exceptions for select
      to authenticated
      using (
        exists (
          select 1 from profiles p
          where p.user_id = auth.uid()
            and (
              p.role = 'admin'
              or (
                p.role in ('analyst','respondent')
                and p.organization_id = recommendation_exceptions.organization_id
              )
            )
        )
      )
    $p$;

    execute 'drop policy if exists "recommendation_exceptions insert scoped" on recommendation_exceptions';
    execute $p$
      create policy "recommendation_exceptions insert scoped"
      on recommendation_exceptions for insert
      to authenticated
      with check (
        exists (
          select 1 from profiles p
          where p.user_id = auth.uid()
            and (
              p.role = 'admin'
              or (
                p.role in ('analyst','respondent')
                and p.organization_id = recommendation_exceptions.organization_id
              )
            )
        )
      )
    $p$;

    execute 'drop policy if exists "recommendation_exceptions decide admin" on recommendation_exceptions';
    execute $p$
      create policy "recommendation_exceptions decide admin"
      on recommendation_exceptions for update
      to authenticated
      using (
        exists (
          select 1 from profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      )
      with check (
        exists (
          select 1 from profiles p
          where p.user_id = auth.uid() and p.role = 'admin'
        )
      )
    $p$;
  end if;
end $$;
