-- 0032_v2_rls_auth_cleanup.sql
-- Fase 3 / Bloco 2 (RLS/Auth): remove residuos de "analyst" das policies.

-- 1) Normaliza tabela opcional de notas de supervisao (quando existir).
do $$
begin
  if to_regclass('public.action_plan_supervision_notes') is not null then
    update public.action_plan_supervision_notes
    set author_role = 'admin'
    where author_role = 'analyst';

    alter table public.action_plan_supervision_notes
      drop constraint if exists action_plan_supervision_notes_author_role_check;

    alter table public.action_plan_supervision_notes
      add constraint action_plan_supervision_notes_author_role_check
      check (author_role in ('admin'));
  end if;
end $$;

-- 2) Reescreve policies do schema public que ainda citam "analyst".
do $$
declare
  pol record;
  role_name text;
  roles_clause text;
  new_policyname text;
  new_qual text;
  new_with_check text;
  create_stmt text;
begin
  for pol in
    select *
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~* '\manalysts?\M'
        or coalesce(with_check, '') ~* '\manalysts?\M'
        or policyname ~* '\manalysts?\M'
      )
  loop
    new_policyname := pol.policyname;
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    new_policyname := regexp_replace(new_policyname, '\manalysts\M', 'admins', 'gi');
    new_policyname := regexp_replace(new_policyname, '\manalyst\M', 'admin', 'gi');

    if new_qual is not null then
      new_qual := regexp_replace(new_qual, '\manalysts\M', 'admins', 'gi');
      new_qual := regexp_replace(new_qual, '\manalyst\M', 'admin', 'gi');
      new_qual := regexp_replace(new_qual, '''admin''\s*,\s*''admin''', '''admin''', 'g');
    end if;

    if new_with_check is not null then
      new_with_check := regexp_replace(new_with_check, '\manalysts\M', 'admins', 'gi');
      new_with_check := regexp_replace(new_with_check, '\manalyst\M', 'admin', 'gi');
      new_with_check := regexp_replace(new_with_check, '''admin''\s*,\s*''admin''', '''admin''', 'g');
    end if;

    roles_clause := '';
    if pol.roles is not null and array_length(pol.roles, 1) is not null then
      foreach role_name in array pol.roles
      loop
        if roles_clause <> '' then
          roles_clause := roles_clause || ', ';
        end if;
        roles_clause := roles_clause || format('%I', role_name);
      end loop;
    else
      roles_clause := 'public';
    end if;

    execute format(
      'drop policy if exists %I on %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );

    if new_policyname <> pol.policyname then
      execute format(
        'drop policy if exists %I on %I.%I',
        new_policyname,
        pol.schemaname,
        pol.tablename
      );
    end if;

    create_stmt := format(
      'create policy %I on %I.%I as %s for %s to %s',
      new_policyname,
      pol.schemaname,
      pol.tablename,
      case when pol.permissive = 'PERMISSIVE' then 'permissive' else 'restrictive' end,
      pol.cmd,
      roles_clause
    );

    if new_qual is not null then
      create_stmt := create_stmt || format(' using (%s)', new_qual);
    end if;

    if new_with_check is not null then
      create_stmt := create_stmt || format(' with check (%s)', new_with_check);
    end if;

    execute create_stmt;
  end loop;
end $$;
