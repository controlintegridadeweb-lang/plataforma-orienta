# PHASE 6 — RLS QA MATRIX

Data: 2026-05-28
Status: baseline pronta para execucao recorrente em homolog/prod.

## Objetivo

Validar que autorizacao por perfil e isolamento cross-org estao alinhados ao contrato V2.

## Perfis e cenarios

| Perfil | Cenario | Resultado esperado |
|---|---|---|
| admin (org A) | ler dados org A | PASS |
| admin (org A) | escrever dados org A | PASS |
| admin (org A) | ler dados org B | FAIL |
| admin (org A) | escrever dados org B | FAIL |
| respondent (org A) | ler dados org A permitidos pelo fluxo | PASS |
| respondent (org A) | escrever somente payload permitido org A | PASS |
| respondent (org A) | ler/escrever org B | FAIL |

## Endpoints criticos para smoke de autorizacao

- `src/app/api/respondent/forms/submit/route.ts`
- `src/app/api/admin/evidences/[evidenceId]/validate/route.ts`
- `src/app/api/admin/recommendations/route.ts`
- `src/app/api/fami/reprocess/route.ts`

## Queries SQL de verificacao

Arquivo base:

- `supabase/scripts/phase6_rls_qa.sql`

Resultado esperado da bateria:

- nenhuma policy citando papel tecnico legado removido no V2;
- constraints V2 de guardrail presentes;
- enums sem labels legados.

## Evidencia operacional por ambiente

Registrar em cada execucao:

1. ambiente/projeto Supabase;
2. timestamp;
3. resultado de cada query (PASS/FAIL);
4. usuario/role testado por cenario;
5. divergencias encontradas e acao corretiva.
