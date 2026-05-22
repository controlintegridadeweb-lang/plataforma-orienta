begin;

-- DESTRUTIVO / IRREVERSIVEL — execute apenas com backup e intencao explicita.
-- Runbook: confirme no ticket ou defina CONFIRM=YES no ambiente da ferramenta
-- que orquestra este SQL (nao ha guard nativo no Postgres para este arquivo).

-- Limpa dados em public e auth.users; recarrega orgs RN.
-- Storage: o Supabase bloqueia DELETE em storage.objects via SQL. Esvazie o bucket
--   com: node supabase/scripts/clean-storage.mjs (ou Dashboard Storage > bucket evidencias)
-- Irreversivel. Backup se necessario.

-- 1) Esvaziar todas as tabelas em public
do $t$
declare
  stmt text;
begin
  select
    'truncate table '
    || string_agg(format('public.%I', table_name), ', ' order by table_name)
    || ' restart identity cascade'
  into stmt
  from information_schema.tables
  where table_schema = 'public'
    and table_type = 'BASE TABLE';

  if stmt is not null then
    execute stmt;
  end if;
end;
$t$;

-- 2) Contas (auth)
delete from auth.users;

-- 3) Catalogo orgs RN (igual a migration 0015)
insert into public.organizations (name) values
  ('ARSEP'),
  ('AGN'),
  ('ASSECOM'),
  ('CAERN'),
  ('CBM'),
  ('CEASA/RN'),
  ('CEHAB'),
  ('CONTROL'),
  ('DATANORTE'),
  ('DEI'),
  ('DER/RN'),
  ('DETRAN/RN'),
  ('DPE'),
  ('EMATER'),
  ('EMGERN'),
  ('EMPARN'),
  ('EMPROTUR'),
  ('FAPERN'),
  ('FJA'),
  ('FUNDASE'),
  ('GAC'),
  ('GVG'),
  ('IDEMA'),
  ('IDIARN'),
  ('IFESP'),
  ('IGARN'),
  ('IPEM'),
  ('IPERN'),
  ('ITEP/RN'),
  ('JUCERN'),
  ('PCRN'),
  ('PGE'),
  ('PMRN'),
  ('POTIGÁS'),
  ('SAPE'),
  ('SEAD'),
  ('SEAP'),
  ('SECULT'),
  ('SEDEC'),
  ('SEDRAF'),
  ('SEEC'),
  ('SEMARH'),
  ('SEMJIDH'),
  ('SEPLAN'),
  ('SESAP'),
  ('SESED'),
  ('SEFAZ'),
  ('SETHAS'),
  ('SETUR'),
  ('SIN'),
  ('UERN')
on conflict (name) do nothing;

commit;
