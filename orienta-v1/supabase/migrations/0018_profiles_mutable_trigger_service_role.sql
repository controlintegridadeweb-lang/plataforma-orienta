-- 0018_profiles_mutable_trigger_service_role.sql
-- Corrige o trigger profiles_enforce_mutable (criado em 0013) para permitir
-- que contextos privilegiados (service_role, migrations, postgres) alterem
-- role/organization_id em profiles. Sem isso, o admin UI (que usa
-- createSupabaseServiceRoleClient) tinha qualquer mudanca silenciosamente
-- revertida porque auth.uid() retorna NULL nesses contextos e o trigger
-- entendia que o ator nao era admin.
--
-- A protecao original (nao deixar usuario comum se autopromover) continua
-- valida: para usuarios autenticados (auth.uid() not null), so admins podem
-- mudar role/organization_id.

create or replace function public.prevent_profiles_role_or_org_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  -- Contextos sem usuario autenticado (service_role, postgres, migrations)
  -- sao confiaveis e podem alterar role/organization_id livremente.
  if auth.uid() is not null then
    if (new.role is distinct from old.role)
       or (new.organization_id is distinct from old.organization_id) then
      if not exists (
        select 1 from profiles p
        where p.user_id = auth.uid() and p.role = 'admin'
      ) then
        new.role = old.role;
        new.organization_id = old.organization_id;
      end if;
    end if;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'Nao e permitido alterar user_id';
  end if;

  return new;
end;
$fn$;
