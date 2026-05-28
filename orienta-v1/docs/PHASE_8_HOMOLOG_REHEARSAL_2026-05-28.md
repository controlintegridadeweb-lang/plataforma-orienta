# PHASE 8 — HOMOLOG REHEARSAL (2026-05-28)

Projeto Supabase validado: `ziszpxkivwtuhnbsbyog`
Runbook de referência: `docs/PHASE_8_GO_LIVE_RUNBOOK.md`

## 1) Preflight técnico (aplicação)

Comandos executados:

- `npm run lint`
- `npm run check:v2-terminology`
- `npm run check:v2-sql-contract`
- `npm test`
- `npm run build`

Resultados:

- `check:v2-terminology`: PASS
- `check:v2-sql-contract`: PASS
- `npm test`: PASS (`287/287`)
- `npm run build`: PASS
- `npm run lint`: PASS (0 erros, warnings não bloqueantes)

Observação de lint:

- warnings existentes de qualidade (`react-hooks/*` e `no-unused-vars`) sem erro bloqueante.

## 2) Verificação de banco/contrato em homolog

Queries executadas no Supabase:

1. Policies legadas por papel técnico antigo
2. Presença das 6 constraints de guardrail V2
3. Enums com labels legados

Resultados:

- Policies legadas: `0` linhas (PASS)
- Constraints guardrail: `6/6` presentes (PASS)
- Enums legados: `0` linhas (PASS)

## 3) Situação do ensaio

Status do ensaio: **PASS**

Pronto:

- Contrato V2 no banco validado.
- Checks V2 e testes automatizados validados.
- Build de produção validado.

Sem bloqueios técnicos no preflight desta execução.

## 4) Próxima ação recomendada

1. Executar smoke HTTP cross-org com credenciais reais em homolog.
2. Registrar evidência final de rollout e seguir janela de produção.
