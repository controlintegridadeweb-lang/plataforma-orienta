-- 0028_remove_analyst_role.sql
-- Fase 4 da remocao do perfil "analyst": converte usuarios legados para
-- admin (preservando organization_id) e recria o enum app_user_role sem
-- o valor 'analyst'.
--
-- Notas de supervisao (action_plan_supervision_notes.author_role) mantem
-- 'analyst' como rotulo historico em linhas antigas; o CHECK continua
-- permitindo ambos ('admin', 'analyst') para nao invalidar dados existentes.
-- Novos registros passam a gravar author_role = 'admin' (aplicacao TS).
--
-- Politicas RLS que ainda mencionam 'analyst' em IN (...) permanecem validas
-- (equivalente a role = 'admin' apos esta migration). Limpeza opcional futura.

-- 1) Converter perfis analyst -> admin (escopo via organization_id).
update public.profiles
set role = 'admin'
where role = 'analyst';

-- 2) Recriar enum sem 'analyst'.
alter type public.app_user_role rename to app_user_role_old;

create type public.app_user_role as enum ('admin', 'respondent');

alter table public.profiles
  alter column role type public.app_user_role
  using role::text::public.app_user_role;

drop type public.app_user_role_old;
