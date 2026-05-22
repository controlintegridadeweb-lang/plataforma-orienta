begin;

-- Limpa dados operacionais de teste e MANTEM a Biblioteca Geral (library_*).
-- Preserva: organizations (catalogo RN), library_axes/sections/metrics, versoes,
--   vocabulario, auditoria da biblioteca, excecoes institucionais.
-- Remove: formularios, perguntas, respostas, evidencias, recomendacoes de ciclo,
--   planos de acao, FAMI, relatorios, perfis e usuarios Auth.
--
-- DESTRUTIVO / IRREVERSIVEL — backup antes se necessario.
-- Storage: arquivos no bucket `evidencias` nao sao apagados aqui.
--   Use: node supabase/scripts/clean-storage.mjs (CONFIRM=YES)

-- 1) Dados de formularios, respostas e ciclo de avaliacao
truncate table
  public.evidence_validations,
  public.evidences,
  public.action_plans,
  public.recommendation_changes,
  public.recommendations,
  public.responses,
  public.fami_results,
  public.reports,
  public.form_question_library_snapshot,
  public.question_library_binding,
  public.form_questions,
  public.forms,
  public.questions,
  public.sections,
  public.axes,
  public.audit_logs,
  public.profiles
restart identity cascade;

-- 2) Contas de teste (Auth)
delete from auth.users;

-- 3) Opcional: metricas de efetividade geradas em testes (descomente se quiser zerar)
-- truncate table public.library_effectiveness_snapshots restart identity cascade;

-- 4) Opcional: orgaos criados manualmente fora do catalogo RN (descomente se quiser)
-- delete from public.organizations
-- where name not in (
--   'ARSEP', 'AGN', 'ASSECOM', 'CAERN', 'CBM', 'CEASA/RN', 'CEHAB', 'CONTROL',
--   'DATANORTE', 'DEI', 'DER/RN', 'DETRAN/RN', 'DPE', 'EMATER', 'EMGERN', 'EMPARN',
--   'EMPROTUR', 'FAPERN', 'FJA', 'FUNDASE', 'GAC', 'GVG', 'IDEMA', 'IDIARN', 'IFESP',
--   'IGARN', 'IPEM', 'IPERN', 'ITEP/RN', 'JUCERN', 'PCRN', 'PGE', 'PMRN', 'POTIGÁS',
--   'SAPE', 'SEAD', 'SEAP', 'SECULT', 'SEDEC', 'SEDRAF', 'SEEC', 'SEMARH', 'SEMJIDH',
--   'SEPLAN', 'SESAP', 'SESED', 'SEFAZ', 'SETHAS', 'SETUR', 'SIN', 'UERN'
-- );

commit;
