# PHASE 8 — GO-LIVE RUNBOOK

## Objetivo

Executar rollout V2 com rastreabilidade, smoke test e janela de rollback definida.

## Sequencia por ambiente

1. **dev**
   - aplicar migrations pendentes;
   - rodar checks (`check:v2-terminology`, `check:v2-sql-contract`, `test`);
   - smoke funcional basico.
2. **homolog**
   - repetir passo de dev;
   - executar bateria de RLS (`supabase/scripts/phase6_rls_qa.sql`);
   - validar relatorios/exports.
3. **prod**
   - janela aprovada;
   - backup previo;
   - deploy + migrations;
   - smoke pos-deploy imediato.

## Backup e rollback

- Backup logico do banco antes do deploy.
- Snapshot/config de variaveis de ambiente da release.
- Rollback:
  1. reverter deploy da aplicacao;
  2. bloquear escrita em fluxos criticos se necessario;
  3. executar plano de restauracao de dados conforme incidente.

## Smoke test pos-deploy

- Login admin e respondent.
- Submissao de formulario respondent.
- Validacao de evidencia admin.
- Gatilho de recomendacao para `answer=no` e para `invalidated`.
- Confirmar que `adjustment_requested` nao cria recomendacao.
- Geracao de relatorio oficial e export CSV.

## Monitoramento inicial (24-48h)

- Taxa de erro de APIs criticas (`/api/respondent/forms/submit`, `/api/admin/evidences/*`, `/api/recommendations/*`, `/api/reports/*`).
- Falhas de processamento em recomendacoes/FAMI.
- Crescimento de retries/timeout em endpoints de exportacao.

## Criterios de aceite final

- Sem incidentes de autorizacao cross-org.
- Sem regressao de nomenclatura V2 em UI/relatorios.
- Checks de CI verdes em PRs de hotfix pos-go-live.
