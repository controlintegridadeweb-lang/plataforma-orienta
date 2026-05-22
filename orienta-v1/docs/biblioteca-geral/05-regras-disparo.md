# 05 — Regras de disparo por cenario

A regra de disparo conecta uma pergunta a um comportamento previsivel
do motor de recomendacoes: dado um cenario de resposta, quais
recomendacoes-base sao geradas, com qual prioridade, e quais
acoes-modelo sao sugeridas no Plano de Acao.

Este documento fixa o formato obrigatorio dessas regras e suas regras
de qualidade. As regras sao **obrigatoriamente declarativas** e ficam
armazenadas junto do vinculo pergunta -> Biblioteca
(`question_library_binding`) e congeladas no snapshot quando o
formulario e publicado.

## Vocabulario: texto de recomendacao vs plano de acao

- **Modelo de recomendacao** (`library_recommendations`, aba **Recomendações** na Biblioteca Geral): texto reutilizavel no catalogo corporativo.
- **Texto da recomendacao no cenario**: o que o admin ou analista edita em **Formularios → Vinculos** para cada cenario; o motor usa principalmente o campo `title` (e texto-base fixo/parametrizavel opcional).
- **Modelo de plano de acao** (`library_actions`, aba **Plano de acao** na Biblioteca): plantilla operacional (prazo sugerido em dias, prioridade sugerida, area, tags, etc.) — nao substitui o texto da recomendacao.
- **Tarefas no vinculo**: itens opcionais apenas naquele formulario (`bindings.*.actions`); nao sao o catalogo de planos.
- **Recomendacao gerada**: instancia apos resposta/FAMI (`recommendations`), ligada ao orgao/ciclo.
- **Plano de acao do orgao** (`action_plans`): instancia preenchida ou confirmada pelo respondente; admin e analista acompanham nas telas de plano de acao.

## Cenarios oficiais de resposta

As chaves abaixo sao a fonte canonica usada em codigo (`binding-types.ts`,
`LIBRARY_SCENARIOS`) e no banco (`question_library_binding.bindings`).
UI, APIs, documentos e testes devem usar exatamente estas chaves.

| Cenario | Significado | Pontua no FAMI | Gera recomendacao por padrao? |
|---|---|---|---|
| `nao` | Resposta negativa. | 0 | Sim (tipo `nao_implementacao`). |
| `parcialmente` | Resposta `Parcialmente`. | 0 | Sim (tipo `implementacao_parcial`). |
| `sim_sem_evidencia` | Pergunta exige comprovacao mas respondente nao anexou. | 0 | Sim (tipo `ausencia_evidencia`). |
| `sim_evidencia_invalida` | Evidencia `invalida`. | 0 | Sim (tipo `evidencia_insuficiente`). |
| `sim_evidencia_valida` | Pergunta exige comprovacao e evidencia `valida` ou `dispensada`. | 1,5 | Nao. |
| `nao_se_aplica` | Questao fora do perfil do orgao. | Fora do calculo | Nao. |
| `em_andamento` | Acao em execucao pelo orgao. | 0 | Opcional. |
| `nao_sabe` | Respondente declara desconhecimento. | 0 | Opcional. |
| `em_revisao` | Resposta em revisao pelo analista. | 0 | Nao. |
| `fora_de_escopo` | Questao fora do escopo do diagnostico atual. | Fora do calculo | Nao. |

Os cenarios aplicaveis a cada pergunta dependem de:

- exigencia de comprovacao (bool);
- `answer_type` da metrica (ex.: `yes_no` nao tem `parcialmente`);
- se a pergunta participa do FAMI.

Cenarios obrigatorios para publicacao de formulario (validados em
`validateBindingForPublish`):

- `nao`, `parcialmente`, `sim_sem_evidencia`, `sim_evidencia_invalida`.

## Estrutura do `bindings` por pergunta

Formato do campo `bindings` em `question_library_binding`:

```json
{
  "nao": {
    "recommendation_id": "uuid-recomendacao",
    "action_ids": ["uuid-acao-1", "uuid-acao-2"],
    "severity": "high",
    "note": "opcional - observacao interna"
  },
  "parcialmente": {
    "recommendation_id": "uuid-recomendacao",
    "action_ids": ["uuid-acao-1"],
    "severity": "medium"
  },
  "sim_evidencia_invalida": {
    "recommendation_id": "uuid-recomendacao-evidencia",
    "action_ids": [],
    "severity": "high"
  }
}
```

Regras do formato (espelham o tipo `LibraryScenarioBinding`):

- chaves do mapa sao cenarios oficiais;
- `recommendation_id` e obrigatorio quando o cenario gera recomendacao
  por padrao;
- `severity` sobrescreve `severity_hint` da metrica/recomendacao-base
  apenas quando necessario (`high` | `medium` | `low`);
- `action_ids` referenciam acoes-modelo que devem ser sugeridas no
  Plano de Acao;
- cenarios que nao geram recomendacao podem ser omitidos.

## Cobertura minima obrigatoria

Uma pergunta so e considerada "completa" quando todos os cenarios
aplicaveis de nao conformidade estao mapeados. O motor considera
aplicaveis os cenarios com base na matriz:

| Configuracao da pergunta | Cenarios aplicaveis obrigatorios |
|---|---|
| Sim/Nao, sem comprovacao, participa FAMI | `nao` |
| Sim/Nao/Parcial, sem comprovacao, participa FAMI | `nao`, `parcialmente` |
| Sim/Nao, exige comprovacao, participa FAMI | `nao`, `sim_sem_evidencia`, `sim_evidencia_invalida` |
| Sim/Nao/Parcial, exige comprovacao, participa FAMI | `nao`, `parcialmente`, `sim_sem_evidencia`, `sim_evidencia_invalida` |
| Questao apenas operacional (nao FAMI) | `nao`, `parcialmente` conforme tipo. |

A publicacao do formulario bloqueia quando a cobertura minima nao for
100%.

## Parametrizacao de texto

Cada regra pode carregar valores de variaveis que serao aplicados ao
bloco parametrizavel da recomendacao-base no momento do disparo.

```json
{
  "nao": {
    "recommendation_id": "uuid-recomendacao",
    "priority": "high",
    "action_ids": ["uuid-acao-1"],
    "variables": {
      "nome_politica": "Politica de Integridade",
      "setor_responsavel": "Controladoria Interna",
      "prazo_referencia": "180 dias"
    }
  }
}
```

Validacoes:

- todas as variaveis declaradas em `variaveis_parametro` da
  recomendacao-base com `required = true` devem estar presentes;
- variaveis desconhecidas sao rejeitadas na validacao do binding.

## Pontuacao de confianca da recomendacao

Ao disparar, o motor registra um `confidence_score` para a recomendacao
gerada, baseado na combinacao de cenario + evidencia:

| Cenario | `confidence_score` |
|---|---|
| `nao`, `parcialmente` | `high` |
| `sim_evidencia_invalida` | `high` |
| `sim_sem_evidencia` | `medium` |
| Conflito detectado (ver 03) | `low` ate que analista revise |

`confidence_score` e rotulo informativo que aparece no portfolio e
ajuda o analista a priorizar revisoes.

## Deduplicacao

Quando a mesma resposta acionar varias regras que produzam a mesma
recomendacao (identificada por `recommendation_id` + `code`), o
portfolio armazena uma unica entrada com trilha de origem multipla
(lista de regras que a geraram). Ver 03 para detalhes.

## Auditoria das regras de disparo

Cada alteracao em `bindings` gera evento `form.question.binding_updated`
com diff por cenario.

Ao publicar o formulario, as regras sao copiadas para o snapshot e
congeladas. Edicoes posteriores em `bindings` do catalogo nao afetam
formularios ja publicados (principio do snapshot).

## Exemplo institucional

Pergunta: "Existe politica formal de prevencao a fraudes?"

- `answer_type = yes_no`
- `exige_comprovacao = true`
- `participa_fami = true`

Vinculo obrigatorio:

- Eixo `Governanca`, Secao `Integridade e Etica`.
- Metrica `M-INT-01 Existencia de politica de prevencao a fraudes`.

`bindings` obrigatorio:

```json
{
  "nao": {
    "recommendation_id": "rec-prev-fraudes",
    "severity": "high",
    "action_ids": ["act-elaborar-politica", "act-publicar-politica"],
    "note": "Variaveis esperadas: { nome_politica = 'Politica de Prevencao a Fraudes' }"
  },
  "sim_sem_evidencia": {
    "recommendation_id": "rec-documentar-politica",
    "severity": "medium",
    "action_ids": ["act-anexar-politica"]
  },
  "sim_evidencia_invalida": {
    "recommendation_id": "rec-revisar-politica",
    "severity": "high",
    "action_ids": ["act-revisar-politica"]
  }
}
```

Efeito operacional: um respondente que marcar "Nao" recebe
automaticamente a recomendacao "Prevencao a fraudes" no portfolio e
ve, no Plano de Acao, as duas acoes-modelo sugeridas com prazo e
criterio de conclusao prontos para edicao.
