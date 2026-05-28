# V2 Rule Impact Matrix

Matriz inicial da Fase 0 com os principais desvios identificados e seus pontos de impacto.

## 1) Respostas oficiais (`yes/no/not_applicable`)

- **Regra oficial:** remover valores legados de resposta.
- **Desvio atual:** contratos e UI ainda aceitam valor legado.
- **Impacto principal:**
  - `src/lib/domain/types.ts`
  - `src/lib/forms/answers-types.ts`
  - `src/lib/workbench/save-workbench-response.ts`
  - `src/components/respondente/respondent-question-panel.tsx`
  - `src/app/api/fami/calculate/route.ts`
  - `src/app/api/recommendations/infer/route.ts`
  - `supabase/migrations/0001_orienta_v1.sql`

## 2) Remocao de estados legados de validacao

- **Regra oficial:** nao existem estados legados de validacao.
- **Desvio atual:** status ainda presente no dominio e validacoes.
- **Impacto principal:**
  - `src/lib/domain/types.ts`
  - `src/lib/domain/status-registry.ts`
  - `src/lib/domain/recommendation-engine.ts`
  - `src/lib/domain/recommendation-engine-v2.ts`
  - `src/components/evidencias/evidence-validate-panel.tsx`
  - `src/app/api/workbench/validate-evidence/route.ts`
  - `supabase/migrations/0001_orienta_v1.sql`

## 3) Perfis oficiais (`admin/respondent`)

- **Regra oficial:** nao existe perfil legado.
- **Desvio atual:** perfil legado ainda aparece em enum, RLS, rotas e textos.
- **Impacto principal:**
  - `supabase/migrations/0001_orienta_v1.sql`
  - `supabase/migrations/0020_library_writes_admin_only.sql` (renomear)
  - `next.config.ts`
  - `src/lib/action-plans/supervision-presentation.ts`
  - `src/lib/api/tenant-guard.ts`

## 4) Gatilho de recommendation

- **Regra oficial:** recommendation apenas em `answer=no` ou `evidence.status=invalidated`.
- **Desvio atual:** motor aceita cenario parcial e outros legados.
- **Impacto principal:**
  - `src/lib/domain/recommendation-engine.ts`
  - `src/lib/domain/recommendation-engine-v2.ts`
  - `src/lib/library/binding-types.ts`
  - `src/lib/supabase/workflows.ts`
  - `src/app/api/recommendations/infer/route.ts`

## 5) `adjustment_requested` nao gera recommendation

- **Regra oficial:** ajuste nao dispara recommendation.
- **Desvio atual:** nomenclatura e fluxos usam status legado de complementacao.
- **Impacto principal:**
  - `src/lib/domain/types.ts`
  - `src/lib/domain/status-registry.ts`
  - `src/lib/evidences/respondent-status.ts`
  - `src/components/formulario/answers/answers-individual-view.tsx`
  - `src/lib/supabase/workflows.ts`

## 6) FAMI com peso uniforme

- **Regra oficial:** mesmo peso para todas as perguntas.
- **Desvio atual:** peso varia por `requiresEvidence`.
- **Impacto principal:**
  - `src/lib/domain/fami.ts`
  - `src/lib/supabase/workflows.ts`
  - `src/app/api/fami/calculate/route.ts`

## 7) Escala FAMI oficial

- **Regra oficial:** 0-20 / 21-40 / 41-60 / 61-80 / 81-100.
- **Desvio atual:** cortes atuais sao 25/50/75/90.
- **Impacto principal:**
  - `src/lib/domain/fami.ts`
  - `src/components/fami/*`
  - `src/components/respondente-fami/*`
  - `src/lib/report/pdf/sections/fami-section.ts`

## 8) Nao existe FAMI pos plano de acao

- **Regra oficial:** FAMI e fotografia do diagnostico.
- **Desvio atual:** mensagens e fluxos ainda associam atualizacao FAMI apos respostas/validacoes em ciclo amplo.
- **Impacto principal:**
  - `src/lib/fami/README.md`
  - `src/app/api/respondent/forms/submit/route.ts`
  - `src/components/respondente-fami/respondent-fami-score-notice.tsx`
  - `src/components/fami/fami-maturity-shell.tsx`

## 9) Estados oficiais de formulario/acao/recommendation

- **Regra oficial:** seguir `docs/STATUS_RULES.md`.
- **Desvio atual:** coexistem estados legados (`under_review`, `consolidated`, `resolved`, `dismissed`, `to_implement`, `cancelled`).
- **Impacto principal:**
  - `src/lib/domain/workflow.ts`
  - `src/lib/domain/status-registry.ts`
  - `src/lib/recommendations/schemas.ts`
  - `src/lib/action-plans/schemas.ts`
  - `src/components/formulario/form-state-badge.tsx`

---

## Priorizacao sugerida (Fase 1 em diante)

1. Contratos canonicos de tipo/schema.
2. Migracoes de banco e RLS.
3. Motor de recommendation.
4. Calculo FAMI.
5. Estados/fluxo.
6. UI e limpeza arquitetural.
