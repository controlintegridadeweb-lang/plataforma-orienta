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

## 4) Smoke HTTP cross-org (executado)

Contexto de teste:

- Criado seed adicional de homolog para segunda organização:
  - `organizationId = 3d895dfb-7d38-4b50-a456-1df6f376a430`
  - `formId = e93576db-e1d0-4eed-b9e7-9180136c0f96`
- Usuários de teste (admin/respondent) vinculados a essa organização.

Casos executados:

1. Admin org-scoped tentando acessar recomendação de outra organização:
   - `GET /api/admin/recommendations/a24071cd-9dae-4de5-93e2-768a62fecf9b`
   - Resultado: `403` (`Acesso fora da organizacao permitida.`) ✅
2. Admin org-scoped tentando validar evidência de outra organização:
   - `POST /api/admin/evidences/950277d4-b95f-419c-8636-04fd26dd91fe/validate`
   - Resultado: `403` (`Acesso fora da organizacao permitida.`) ✅
3. Respondent submetendo formulário da própria organização:
   - `POST /api/respondent/forms/submit`
   - Resultado: `200` ✅
4. Validação `invalidated` em evidência da própria organização:
   - Resultado: `200`, `recommendationsCreated = 1` ✅
5. Validação `adjustment_requested` na mesma evidência:
   - Resultado: `200`, `recommendationsCreated = 0` ✅

Verificação final no banco (organização nova):

- Consulta em `recommendations` por `organization_id = 3d895dfb-7d38-4b50-a456-1df6f376a430`
- Resultado: `0` linhas após `adjustment_requested` ✅
- Confirma regra V2: `adjustment_requested` não mantém/gera recommendation ativa.

## 5) Próxima ação recomendada

1. Abrir janela controlada de produção conforme runbook.
2. Repetir smoke pós-deploy imediato em produção.
3. Monitorar 24-48h com critérios do runbook.
