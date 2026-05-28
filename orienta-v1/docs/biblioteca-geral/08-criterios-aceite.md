# 08 — Criterios de aceite

Criterios testaveis para homologacao da Biblioteca Geral V1. Cada
criterio e associado a uma frente especifica e, quando aplicavel, ao
teste automatizado ou manual correspondente.

## Formato

Cada item segue `Given / When / Then` em portugues.

## Dominio e cadastro

### CA-01 — Criacao de eixo minimo
- Dado que sou Administrador,
- Quando crio um eixo com `code`, `name`, `description` e `ordem`
  validos,
- Entao o item e salvo como `draft` com `version = 0.1.0` e registra
  evento `library.item.created`.

### CA-02 — Codigo duplicado e bloqueado
- Dado que existe um eixo com `code = GOV`,
- Quando tento criar outro eixo com `code = GOV`,
- Entao o sistema retorna erro de conflito e nao grava.

### CA-03 — Secao exige eixo publicado
- Dado que o eixo `GOV` esta em `draft`,
- Quando tento publicar uma secao vinculada ao eixo `GOV`,
- Entao a publicacao e bloqueada com mensagem indicando o eixo nao
  publicado.

### CA-04 — Campos minimos por tipo
- Dado que estou criando uma recomendacao-base,
- Quando tento salvar como `in_review` sem `fundamento_tecnico` ou
  `escopo_aplicacao`,
- Entao o sistema rejeita e lista os campos faltantes.

## Governanca e ciclo de vida

### CA-10 — Transicao `draft -> in_review`
- Dado um item em `draft` completo,
- Quando submeto para revisao,
- Entao o status passa para `in_review` e registra evento de
  auditoria com autor.

### CA-11 — Revisor diferente do autor
- Dado uma recomendacao-base em `in_review` criada pelo usuario A,
- Quando o proprio usuario A tenta aprovar,
- Entao o sistema bloqueia exigindo revisor tecnico distinto.

### CA-12 — Publicacao exige checklist 100%
- Dado uma recomendacao-base em `in_review` com checklist pendente,
- Quando Administrador tenta publicar,
- Entao a publicacao e bloqueada com lista das pendencias.

### CA-13 — Depreciacao com justificativa
- Dado um item em `published`,
- Quando Administrador depreca sem justificativa,
- Entao o sistema rejeita.
- E quando depreca com justificativa,
- Entao o item fica `deprecated` e o evento de auditoria guarda o
  motivo.

## Versionamento e snapshot

### CA-20 — Nova versao gera historico
- Dado um item `published` na versao inicial `0.1.0` (convencao
  definida em `04-fluxos.md`, fluxo 1),
- Quando Administrador cria nova versao e publica como `0.2.0`,
- Entao existe linha imutavel em `library_item_versions` para `0.1.0`
  e outra para `0.2.0`, com `previous_version_id` ligando corretamente.

### CA-21 — Snapshot de formulario e imutavel
- Dado um formulario publicado com snapshot capturado,
- Quando edito a recomendacao-base vinculada e publico nova versao,
- Entao o snapshot original permanece com a versao antiga e respostas
  desse formulario continuam disparando a versao antiga.

### CA-22 — Reconstituicao historica
- Dado um diagnostico emitido ha 6 meses,
- Quando consulto o detalhe da recomendacao gerada,
- Entao consigo identificar exatamente o `item_version_id` da
  recomendacao e da acao-modelo aplicadas, com payload completo.

## Vinculacao pergunta e Biblioteca

### CA-30 — Publicacao bloqueada sem vinculo minimo
- Dado uma pergunta sem `metric_id` ou sem `bindings` definidos,
- Quando Administrador tenta publicar o formulario,
- Entao a publicacao e bloqueada com lista das perguntas e lacunas.

### CA-31 — Publicacao bloqueada sem cobertura minima
- Dado uma pergunta com `answer_type = yes_no`, `exige_comprovacao
  = true` e `participa_fami = true`,
- Quando o `bindings` nao cobre todos os cenarios obrigatorios,
- Entao a publicacao e bloqueada sinalizando os cenarios faltantes.

### CA-32 — Variaveis de parametrizacao validadas
- Dado uma recomendacao-base com `variaveis_parametro` incluindo
  `nome_politica (required)`,
- Quando um binding omite `nome_politica`,
- Entao o sistema bloqueia a publicacao do formulario.

## Motor de recomendacoes

### CA-40 — Resposta `nao` gera recomendacao automatica
- Dado uma pergunta publicada com binding para `nao`,
- Quando o respondente envia resposta `nao`,
- Entao o sistema gera recomendacao-base correspondente no portfolio,
  com `priority` definida no binding e acoes-modelo sugeridas no Plano
  de Acao.

### CA-41 — Evidencia valida nao gera recomendacao de evidencia
- Dado uma pergunta com comprovacao exigida,
- Quando a resposta e `sim` e a evidencia e validada como `valida`,
- Entao nenhuma recomendacao relacionada a evidencia e gerada.

### CA-42 — Evidencia invalida gera recomendacao
- Dado uma pergunta com comprovacao exigida,
- Quando a resposta e `sim` e a evidencia e `invalida`,
- Entao o sistema gera recomendacao do tipo `evidencia_insuficiente`.

### CA-43 — Deduplicacao
- Dado duas regras que gerem a mesma recomendacao-base para a mesma
  resposta,
- Quando o motor executar,
- Entao o portfolio registra apenas uma entrada com trilha de origem
  indicando as duas regras.

### CA-44 — Idempotencia de reprocessamento
- Dado um formulario reprocessado 3 vezes sem mudanca de resposta,
- Quando comparo o portfolio antes e depois,
- Entao o conteudo e identico, sem duplicacoes.

## Auditoria

### CA-50 — Auditoria completa por transicao
- Dado qualquer transicao de item da Biblioteca,
- Quando consulto o log,
- Entao encontro `actor_user_id`, `from_status`, `to_status`,
  `from_version`, `to_version`, `justification` quando exigida e
  `diff_fields` quando aplicavel.

### CA-51 — Auditoria de binding
- Dado uma edicao de `bindings` em `question_library_binding`,
- Quando consulto o log,
- Entao encontro diff por cenario com valores anterior e posterior.

## Qualidade e excecoes

### CA-60 — Bloqueio de publicacao por checklist
- Dado uma recomendacao-base com itens do checklist em `fail`,
- Quando tento publicar,
- Entao a publicacao e bloqueada e a lista de itens falhos aparece.

### CA-61 — Excecao institucional
- Dado uma recomendacao gerada em um orgao,
- Quando o orgao abre excecao com motivo, prazo e anexos,
- Entao a recomendacao fica `em_excecao` ate o prazo e volta ao fluxo
  quando expirar.

## Efetividade

### CA-70 — Metricas consolidadas
- Dado um periodo de pelo menos um ciclo completo,
- Quando consulto o painel de efetividade,
- Entao vejo as metricas definidas em 07 com faixas verdes/amarelas/
  vermelhas aplicadas.

### CA-71 — Alertas automaticos
- Dado uma recomendacao com `taxa de manutencao` no vermelho por 3
  medicoes consecutivas,
- Quando abro a fila de governanca,
- Entao a recomendacao aparece marcada para revisao.

## Pacote de regressao oficial

A homologacao da biblioteca executa um pacote fixo com, no minimo:

- 1 caso por tipo de item em CRUD completo;
- 1 caso por transicao de estado;
- 1 caso por tipo de recomendacao (`nao_implementacao`,
  `ausencia_evidencia`,
  `evidencia_insuficiente`);
- 1 caso de formulario com todos os cenarios mapeados,
  executando um envio simulado;
- 1 caso de reprocessamento idempotente;
- 1 caso de snapshot imutavel apos versao nova publicada;
- 1 caso de excecao institucional completa.

Toda mudanca de versao `major` em recomendacoes ou metricas deve passar
neste pacote antes de ir para producao.
