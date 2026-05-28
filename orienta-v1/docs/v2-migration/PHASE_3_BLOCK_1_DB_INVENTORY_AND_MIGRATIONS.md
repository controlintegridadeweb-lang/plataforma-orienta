# Fase 3 — Bloco 1 (DB): Inventário técnico e plano de migração

Este documento registra o inventário de resíduos legados de banco e a proposta executável em duas migrations:

1. `0030_v2_data_normalization.sql` (dados)
2. `0031_v2_schema_hardening.sql` (estrutura)

## 1) Inventário técnico (estado atual identificado)

### 1.1 Enums/tipos legados ainda presentes

- `public.answer_value` ainda inclui `partial` (base histórica de `0001`).
- `public.validation_status` ainda inclui labels legados fora do contrato V2.
- `public.library_metric_answer_type` ainda inclui answer type legado removido no V2.
- `public.library_recommendation_type` ainda inclui tipo legado removido no V2.

### 1.2 Payloads JSON com vocabulário legado

- `public.question_library_binding.metric.answerType` com valor legado.
- `public.form_question_library_snapshot.metric.answerType` com valor legado.
- `bindings` com chave legada (deve ser `nao_se_aplica`).
- `response_mapping.scaleBands.partialMax` (deve ser `notApplicableMax`).
- `response_mapping.numericThresholds.partialBelow` (deve ser `notApplicableBelow`).

### 1.3 Papel legado em trilha operacional

- `public.action_plan_supervision_notes.author_role` com potencial papel legado em linhas antigas.

## 2) Proposta executável (duas migrations)

### Migration A — `0030_v2_data_normalization.sql` (dados)

Aplica saneamento de dados/payload:

- valor legado de answer type -> `yes_no` em `question_library_binding.metric` e `form_question_library_snapshot.metric`.
- chave legada -> `nao_se_aplica` em `bindings`.
- `partialMax` -> `notApplicableMax` e `partialBelow` -> `notApplicableBelow` em `response_mapping`.
- `library_recommendations.tipo` legado -> `nao_implementacao`.
- `action_plan_supervision_notes.author_role` legado -> `admin` (idempotente).

### Migration B — `0031_v2_schema_hardening.sql` (estrutura)

Endurece o schema com recriação de enums e cast controlado:

- `answer_value`: remove `partial`, adiciona `not_applicable`.
- `validation_status`: reduz para `pending`, `approved`, `invalidated`, `adjustment_requested`.
- `library_metric_answer_type`: remove valor legado de answer type.
- `library_recommendation_type`: remove tipo legado.
- Atualiza constraint de justificativa em `evidence_validations`:
  - obrigatória em `invalidated` e `adjustment_requested`.

## 3) Ordem de aplicação

1. Executar `0030_v2_data_normalization.sql`.
2. Executar `0031_v2_schema_hardening.sql`.

Motivo: primeiro saneia payloads e valores textuais, depois endurece enum/constraints.

## 4) Verificações recomendadas (pós-migração)

- Confirmar ausência de labels legados nos enums:
  - `answer_value`, `validation_status`, `library_metric_answer_type`, `library_recommendation_type`.
- Confirmar ausência de chave legada em bindings/snapshots.
- Confirmar ausência de `partialMax`/`partialBelow` em `response_mapping`.
- Confirmar ausência de papel legado em `action_plan_supervision_notes`.

## 5) Observações para Bloco 2 (RLS/Auth)

Este bloco não altera políticas RLS legacy que ainda citem o papel técnico legado. A limpeza de RLS/Auth fica no Bloco 2 da Fase 3.

---

## Atualização — Bloco 2 iniciado

Migration criada para limpeza de RLS/Auth:

- `supabase/migrations/0032_v2_rls_auth_cleanup.sql`

Escopo:

- Normaliza `action_plan_supervision_notes.author_role` para `admin` (quando a tabela existir).
- Reescreve políticas de `pg_policies` (schema `public`) que ainda citam o papel técnico legado em `qual`, `with_check` ou nome da policy.
- Recria cada policy mantendo:
  - tabela alvo,
  - modo (`permissive`/`restrictive`),
  - comando (`select`, `insert`, `update`, `delete`, `all`),
  - roles (`to ...`).
