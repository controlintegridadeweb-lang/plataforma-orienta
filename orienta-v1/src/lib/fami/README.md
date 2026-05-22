# FAMI — Coesão formulário → maturidade

Documento de referência para quem mexer em qualquer ponto entre `forms`,
`responses`, `fami_results`, `question_organization_waivers` e as telas que
consomem essas tabelas.

## 1. Modelo único de leitura

Toda superfície que precisa exibir FAMI (dashboard admin, tela FAMI do
respondente, PDF oficial, cards do plano) deve resolver dados via um único
caminho:

```
fami-context  →  fami-snapshot-read  →  fami-maturity-view (SSOT)
```

- [`fami-context.ts`](fami-context.ts) resolve o par (formId, processingVersion).
- [`fami-snapshot-read.ts`](fami-snapshot-read.ts) carrega snapshots oficiais
  (`fami_results`) de forma consistente. Eixos sempre vêm completos e ordenados
  na sequência institucional Governança → Ambiental → Social.
- [`fami-maturity-view.ts`](fami-maturity-view.ts) entrega o contrato
  `FamiMaturityView` com global, axes, meta (aplicáveis, dispensadas,
  encerramento).

**Regra:** não construir leituras paralelas em `dashboards/queries.ts`,
`build-official-report-data.ts` ou em rotas API. Sempre delegar.

## 2. FAMI só no encerramento do ciclo

O score FAMI **não** é calculado durante o preenchimento. Recomendações
continuam sendo atualizadas a cada resposta/evidência; `fami_results` só é
gravado quando:

1. **`POST /api/admin/forms/[formId]/close`** — encerramento do ciclo (Policy B).
2. **`POST /api/fami/reprocess`** — reprocessamento manual, apenas se o
   formulário já foi encerrado ao menos uma vez.

Pré-requisitos para encerrar (aba **Configuração** do formulário):

- Formulário em estado `consolidated`.
- **`response_deadline_at` definido** (prazo orientativo para respondentes).
- Confirmação explícita do admin/analista.

No encerramento: todas as organizações ativas recebem snapshot; perguntas
aplicáveis sem resposta = 0 pts; waivers e `is_not_applicable` saem do
denominador.

## 3. Reabertura

**`POST /api/admin/forms/[formId]/reopen`** — `closed` → `draft`.

- Novas respostas voltam a ser aceitas.
- O **FAMI oficial do último encerramento permanece** até um novo fechamento.
- Não há recálculo automático na reabertura.

## 4. Waivers e "Não se aplica"

Dispensa **por pergunta e órgão** (`organization_id`, `question_id`) — não por
formulário. Se a pergunta X está dispensada para o órgão Y, qualquer formulário
que inclua X respeita a dispensa no FAMI e nas recomendações.

| Mecânica | Quem dispara | UI |
|----------|--------------|-----|
| `question_organization_waivers` | admin | aba **Vínculos** |
| `responses.is_not_applicable` | respondente | workbench (binding `nao_se_aplica`) |

Dispensas não disparam recálculo FAMI até o encerramento.

## 5. Cenários de recomendação

Perguntas que exigem evidência **não** têm cenário "Sim, sem evidência" — o
workbench bloqueia envio de "Sim" sem anexo. Cenário obrigatório adicional:
`sim_evidencia_invalida`.

## 6. Escopos por superfície

| Superfície | Comportamento |
|------------|---------------|
| Dashboard org | FAMI só após encerramento; banner "pendente" antes disso |
| Dashboard global | Média só entre orgs com snapshot de encerramento |
| PDF | Metadados de encerramento no rodapé |
| Configuração | Prazo + encerrar + reabrir |

## 7. Onde tocar quando

- Migrar lógica de cálculo → `lib/supabase/workflows.ts` (`collectQuestionInputs`, `computeFami`).
- Gatilhos → `trigger-reprocess.ts` (`computeFami: true` só em close/manual pós-close).
- Dispensa por órgão → aba Vínculos (`form-question-waivers-panel.tsx`).
- Prazo/encerrar/reabrir → `form-config.tsx`.
