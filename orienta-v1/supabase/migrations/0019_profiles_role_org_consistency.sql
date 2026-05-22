-- 0019_profiles_role_org_consistency.sql
-- Garante que apenas admins podem ter organization_id nulo em profiles.
-- Analistas e respondentes precisam estar vinculados a uma organizacao.
--
-- IMPORTANTE: aplicar APOS corrigir os perfis legados que estejam com
-- organization_id nulo (caso contrario VALIDATE falha). A migration usa
-- NOT VALID + VALIDATE em dois passos para deixar o erro explicito caso
-- haja dados inconsistentes.

alter table public.profiles
  add constraint profiles_role_org_consistency
  check (role = 'admin' or organization_id is not null) not valid;

alter table public.profiles
  validate constraint profiles_role_org_consistency;
