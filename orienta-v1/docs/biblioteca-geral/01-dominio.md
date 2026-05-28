# 01 — Modelo de dominio da Biblioteca Geral

Esta especificacao consolida os campos minimos, invariantes e relacoes
de cada tipo de item. Os nomes de campo usam `snake_case` quando
representam colunas sugeridas de banco e `camelCase` quando representam
tipos de dominio na aplicacao.

## Campos comuns a todos os itens

Todos os itens da Biblioteca compartilham metadados institucionais:

| Campo | Tipo | Obrigatorio | Observacoes |
|---|---|---|---|
| `id` | uuid | sim | Identidade do item. Estavel entre versoes. |
| `code` | texto | sim | Codigo institucional. Unico por tipo. Imutavel apos publicacao. |
| `status` | enum | sim | `draft`, `in_review`, `published`, `deprecated`, `archived`. |
| `version` | texto | sim | Versao semantica `major.minor.patch` do item. |
| `version_major` | inteiro | sim | Derivado de `version`. Facilita filtros. |
| `version_minor` | inteiro | sim | Idem. |
| `version_patch` | inteiro | sim | Idem. |
| `vigente_de` | timestamptz | sim | Inicio da vigencia normativa da versao. |
| `vigente_ate` | timestamptz | nao | Fim da vigencia. Vazio = vigente. |
| `tags` | texto[] | nao | Taxonomia controlada (vocabulario da biblioteca). |
| `fundamento_tecnico` | texto | condicional | Base normativa/referencia tecnica. Obrigatorio em recomendacao e acao-modelo. |
| `created_by` | uuid | sim | Autor da primeira versao do item. |
| `updated_by` | uuid | sim | Ultimo autor que alterou a versao atual. |
| `approved_by` | uuid | condicional | Obrigatorio ao publicar. |
| `approved_at` | timestamptz | condicional | Obrigatorio ao publicar. |
| `deprecated_by` | uuid | condicional | Obrigatorio ao deprecar. |
| `deprecated_at` | timestamptz | condicional | Obrigatorio ao deprecar. |
| `created_at` | timestamptz | sim | |
| `updated_at` | timestamptz | sim | Atualizado por trigger. |

Regras comuns:

- `code` nao pode ser alterado apos o primeiro `published`.
- Item em `draft` pode ser excluido; item `published` so pode ser `deprecated`.
- Toda versao publicada gera registro imutavel em `library_item_versions` (ver 03).

## Eixo (axis)

Raiz hierarquica institucional. V1 tem tres eixos fechados: Governanca,
Ambiental e Social.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `name` | texto | sim | Unico por Biblioteca. |
| `description` | texto | sim | Escopo tematico do eixo. |
| `ordem` | inteiro | sim | Posicao de exibicao (>=0). |

Invariantes:

- Eixo nao pode ser apagado se existir Secao publicada dependente.
- Alterar `name` de eixo publicado exige `version_major` nova.
- V1: criacao de eixos novos exige decisao institucional formal.

## Secao (section)

Agrupamento tematico dentro de um eixo.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `axis_id` | uuid | sim | Referencia obrigatoria para eixo publicado. |
| `name` | texto | sim | Unico por eixo. |
| `description` | texto | sim | Finalidade da secao. |
| `ordem` | inteiro | sim | Posicao dentro do eixo (>=0). |

Invariantes:

- Secao nao existe sem eixo publicado.
- Eixo do qual a secao depende nao pode estar `archived`.

## Metrica analitica (metric)

Regra de interpretacao usada pelo motor de recomendacoes. Nao pontua no
FAMI — orienta apenas o raciocinio analitico.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `name` | texto | sim | |
| `answer_type` | enum | sim | `yes_no`, `scale`, `numeric`, `text`. |
| `interpretation` | enum | sim | `higher_better`, `lower_better`, `qualitative`. |
| `description` | texto | nao | Orientacao para administradores. |
| `severity_hint` | enum | sim | `high`, `medium`, `low`. Prioridade sugerida quando metrica indicar nao conformidade. |
| `trigger_summary` | texto | sim | Descricao curta da condicao de disparo (livre, auditavel). |

Invariantes:

- Mudanca de `answer_type` ou `interpretation` exige `version_major`.
- Metrica nao pontua no FAMI — peso FAMI vive na Questao, nao aqui.

## Recomendacao-base (recommendation)

Texto institucional gerado pelo motor quando houver nao conformidade ou
lacuna documental.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `title` | texto | sim | Titulo institucional. |
| `tipo` | enum | sim | `nao_implementacao`, `ausencia_evidencia`, `evidencia_insuficiente`. |
| `priority_default` | enum | sim | `high`, `medium`, `low`. |
| `texto_base_fixo` | texto | sim | Bloco normativo fixo. Nao aceita variaveis. |
| `texto_base_parametrizavel` | texto | sim | Bloco com variaveis de contexto. |
| `variaveis_parametro` | json | sim | Lista de variaveis aceitas: `[{ key, label, required }]`. |
| `fundamento_tecnico` | texto | sim | Base normativa que justifica a recomendacao. |
| `escopo_aplicacao` | texto | sim | Quando esta recomendacao deve disparar (contexto). |
| `acoes_modelo_sugeridas` | uuid[] | nao | Lista de acoes-modelo compatíveis. |
| `tags` | texto[] | nao | |

Invariantes:

- Publicacao bloqueada enquanto o checklist de qualidade (06) nao
  estiver 100% atendido.
- Texto original preservado no versionamento: edicao cria nova versao
  e mantem historico do texto anterior.
- Variaveis nao declaradas em `variaveis_parametro` que aparecam em
  `texto_base_parametrizavel` geram erro de validacao antes da publicacao.

## Acao-modelo (action)

Sugestao de acao concreta para o Plano de Acao, vinculada a uma ou mais
recomendacoes-base.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `title` | texto | sim | |
| `description` | texto | sim | Descricao da acao sugerida. |
| `suggested_deadline_days` | inteiro | sim | 1..3650. |
| `suggested_priority` | enum | sim | `high`, `medium`, `low`. |
| `suggested_responsible_area` | texto | nao | Area sugerida. |
| `fundamento_tecnico` | texto | sim | |
| `criterio_conclusao` | texto | sim | Como reconhecer que a acao foi concluida. |
| `tags` | texto[] | nao | |

Invariantes:

- Uma acao-modelo pode servir a varias recomendacoes, e vice-versa.
- `criterio_conclusao` e obrigatorio para garantir que o responsavel
  saiba quando a acao esta pronta para ser marcada como concluida.

## Vinculo pergunta -> Biblioteca (question_library_binding)

Nao e item da Biblioteca, mas e a ponte obrigatoria entre uma Pergunta e
os itens reutilizaveis. Representa a regra de disparo congelada ao lado
da pergunta.

| Campo | Tipo | Obrigatorio | Regra |
|---|---|---|---|
| `question_id` | uuid | sim | |
| `axis_id` | uuid | sim | Heranca estrutural. |
| `section_id` | uuid | sim | Heranca estrutural. |
| `metric_id` | uuid | sim | Regra de interpretacao aplicavel. |
| `bindings` | json | sim | Mapa cenario -> { recommendation_id, priority, action_ids }. |

O formato de `bindings` esta detalhado em [05-regras-disparo.md](05-regras-disparo.md).

## Taxonomia e vocabulario

- `tags` e vocabulario controlado mantido pelo Administrador.
- Tag nao existente no vocabulario e rejeitada na publicacao.
- Sugestoes de tag novas podem ser registradas em `draft` mas exigem
  aprovacao antes de aparecer em itens publicados.

## Relacao com o banco atual

As tabelas existentes em `supabase/migrations/0002_biblioteca_geral.sql`
cobrem os tipos basicos. Para atender esta especificacao, as seguintes
extensoes serao necessarias (detalhadas no backlog em [09-backlog.md](09-backlog.md)):

- adicionar colunas `status`, `version*`, `vigente_*`, `approved_*`,
  `deprecated_*`, `created_by`, `updated_by`, `tags` em todas as tabelas
  `library_*`;
- criar `library_item_versions` para historico imutavel;
- estender `library_metrics` com `severity_hint`, `trigger_summary`,
  `description`;
- estender `library_recommendations` com `tipo`, `texto_base_fixo`,
  `texto_base_parametrizavel`, `variaveis_parametro`, `fundamento_tecnico`,
  `escopo_aplicacao`;
- estender `library_actions` com `suggested_priority`,
  `suggested_responsible_area`, `fundamento_tecnico`,
  `criterio_conclusao`;
- criar tabela associativa `library_recommendation_actions`;
- criar tabela `question_library_binding` com indice por `question_id`.
