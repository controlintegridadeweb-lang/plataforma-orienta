# PHASE 7 — GUARDRAILS DEFINITIVOS

## Guardrails ativos

- CI obrigatório:
  - `npm run lint`
  - `npm run check:v2-terminology`
  - `npm run check:v2-sql-contract`
  - `npm run test`
  - `npm run build`
- Guardrails de banco em migrations:
  - `supabase/migrations/0033_v2_guardrails.sql`
- Checklist de PR:
  - `.github/pull_request_template.md`

## Objetivo de bloqueio

Detectar regressao de contrato V2 antes de merge (vocabulário, enums/policies/constraints e regras centrais).

## Operacao esperada

1. PR aberto com checklist preenchido.
2. CI executa checks de contrato.
3. Qualquer falha bloqueia merge.
