# Fase 3 — Bloco 3 (Guardrails)

Migration criada:

- `supabase/migrations/0033_v2_guardrails.sql`

## Objetivo

Evitar reintrodução de payloads legados no banco após as migrações de normalização e hardening.

## Regras protegidas

Em `question_library_binding` e `form_question_library_snapshot`, bloqueia:

- `metric.answerType` com valor legado removido no V2
- chave de `bindings` legada removida no V2
- presença textual de `partialMax` e `partialBelow` em `response_mapping`

## Comportamento

- Guardrails idempotentes (`if not exists` por constraint).
- Compatível com ambientes parciais (`to_regclass`).
- Falha cedo em `insert/update` que viole contrato V2.

## Como validar

```sql
select conrelid::regclass as table_name, conname
from pg_constraint
where conname in (
  'question_library_binding_metric_answer_type_v2_check',
  'question_library_binding_bindings_v2_check',
  'question_library_binding_response_mapping_v2_check',
  'form_question_library_snapshot_metric_answer_type_v2_check',
  'form_question_library_snapshot_bindings_v2_check',
  'form_question_library_snapshot_response_mapping_v2_check'
)
order by conname;
```
