# PHASE 8 — PROD GO/NO-GO (2026-05-28)

Projeto: Plataforma Orienta V2
Data: 2026-05-28
Ambiente de validação final: homolog (`ziszpxkivwtuhnbsbyog`)

## Decisão recomendada

**GO (aprovado)** para janela controlada de produção.

## Checklist de decisão

1. Contrato V2 no banco validado (policies/constraints/enums): **PASS**
2. Checks de qualidade V2 (`terminology`, `sql-contract`): **PASS**
3. Testes automatizados (`vitest`): **PASS**
4. Build de produção: **PASS**
5. Smoke cross-org em homolog (bloqueio de acesso indevido): **PASS**
6. Regra crítica de recommendation:
   - `invalidated` gera recommendation: **PASS**
   - `adjustment_requested` não gera recommendation ativa: **PASS**
7. Evidências documentadas em:
   - `../v2-migration/PHASE_6_RLS_QA_MATRIX.md`
   - `../v2-migration/PHASE_6_CLOSURE_SUMMARY.md`
   - `PHASE_8_HOMOLOG_REHEARSAL_2026-05-28.md`

## Risco residual

- Baixo.
- Risco principal é operacional de janela/deploy, mitigado por runbook e monitoramento de 24-48h.

## Condições para execução em produção

1. Confirmar backup lógico pré-janela.
2. Confirmar responsáveis on-call para aplicação e banco.
3. Executar smoke pós-deploy imediato do runbook:
   - login admin/respondent;
   - submissão respondent;
   - validação admin;
   - recommendation/FAMI;
   - relatório oficial e export CSV.
4. Monitorar APIs críticas e falhas de processamento por 24-48h.

## Critério de rollback

Acionar rollback se houver:

- incidente de autorização cross-org;
- quebra de geração de recommendation/FAMI;
- falha recorrente de export/report com impacto operacional.
