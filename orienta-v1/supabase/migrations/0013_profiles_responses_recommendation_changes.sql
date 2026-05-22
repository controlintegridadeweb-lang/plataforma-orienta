-- 0013_profiles_responses_recommendation_changes.sql
-- Perfil: nome e preferencias; leitura de organizacao; reforco de autoria em
-- respostas; RLS em recommendation_changes.

-- 1) Colunas de perfil (dados pessoais e preferencias JSON)
alter table profiles add column if not exists full_name text;
alter table profiles add column if not exists preferences jsonb not null default '{}'::jsonb;

-- 2) Leitura da organizacao vinculada (nome real no UI)
create policy "organizations read scoped"
on organizations for select
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
  or id in (
    select p.organization_id from profiles p
    where p.user_id = auth.uid() and p.organization_id is not null
  )
);

-- 3) Respostas: respondente so enxerga/altera o proprio registro; analista o da org; admin tudo
drop policy if exists "responses by org members" on responses;
create policy "responses scoped by org and authorship"
on responses for all
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
  or (
    organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
    and (
      created_by = auth.uid()
      or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'analyst')
    )
  )
)
with check (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
  or (
    organization_id = (select p.organization_id from profiles p where p.user_id = auth.uid())
    and (
      created_by = auth.uid()
      or exists (select 1 from profiles p where p.user_id = auth.uid() and p.role in ('analyst', 'admin'))
    )
  )
);

-- 4) Perfil: trigger impede troca de role/organizacao sem ser admin; politicas de update
create or replace function public.prevent_profiles_role_or_org_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $fn$
begin
  if (new.role is distinct from old.role) or (new.organization_id is distinct from old.organization_id) then
    if not exists (
      select 1 from profiles p
      where p.user_id = auth.uid() and p.role = 'admin'
    ) then
      new.role = old.role;
      new.organization_id = old.organization_id;
    end if;
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'Nao e permitido alterar user_id';
  end if;
  return new;
end;
$fn$;

drop trigger if exists profiles_enforce_mutable on profiles;
create trigger profiles_enforce_mutable
before update on profiles
for each row execute function public.prevent_profiles_role_or_org_change();

create policy "profiles self update"
on profiles for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "profiles admin update"
on profiles for update
to authenticated
using (exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin'))
with check (true);

-- 5) recommendation_changes: RLS (insercao via service_role no admin; leitura escopada)
alter table recommendation_changes enable row level security;

create policy "recommendation_changes read scoped"
on recommendation_changes for select
to authenticated
using (
  exists (select 1 from profiles p where p.user_id = auth.uid() and p.role = 'admin')
  or exists (
    select 1
    from recommendations r
    join profiles p on p.user_id = auth.uid()
    where r.id = recommendation_changes.recommendation_id
      and r.organization_id = p.organization_id
      and p.role in ('analyst', 'admin')
  )
);
