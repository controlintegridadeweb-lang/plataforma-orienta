# FLOW OPERACIONAL

## Macrofluxo Operacional

Diagnostico
↓
Resposta
↓
Evidencia
↓
Validacao
↓
Recomendacao
↓
Plano de acao
↓
Monitoramento
↓
Relatorio

## Regras Oficiais do Diagnostico

Tipos oficiais de resposta:

- Sim
- Nao
- Nao se aplica

Recomendacao nasce apenas quando:

- resposta = Nao
OU
- evidencia = Invalidada

Solicitar ajuste nao gera recomendacao.
Nao havera FAMI pos plano de acao.
O diagnostico representa uma fotografia do momento da avaliacao.

## Estrutura dos Formularios

Cada formulario deve possuir:

- nome;
- descricao;
- objetivo;
- versao;
- data de abertura;
- data limite;
- status;
- eixos;
- secoes;
- perguntas;
- respondentes vinculados.

## Estrutura das Perguntas

Cada pergunta deve possuir:

- eixo;
- secao;
- texto;
- descricao de apoio;
- obrigatoria;
- exige evidencia;
- parametro de evidencia;
- criterio de conformidade;
- recomendacao-base;
- ordem.

## Estrutura das Evidencias

Cada evidencia deve possuir:

- pergunta vinculada;
- resposta vinculada;
- arquivo;
- tipo;
- status;
- comentario do administrador;
- historico de versoes.

Status:

- pending
- approved
- invalidated
- adjustment_requested

## Estrutura das Recomendacoes

Cada recomendacao deve possuir:

- formulario;
- organizacao;
- eixo;
- secao;
- pergunta de origem;
- motivo;
- recomendacao-base;
- observacao do administrador;
- status.

Status:

- open
- awaiting_action_plan
- in_action_plan
- in_monitoring
- completed
- validated

## Plano de Acao

O plano de acao nasce a partir de recomendacoes aprovadas.
Cada recomendacao pode possuir varias acoes.

Cada acao deve possuir:

- titulo;
- descricao;
- responsavel;
- prazo;
- status;
- observacoes;
- evidencia complementar.

## Eventos Operacionais

Eventos principais:

- admin publica formulario;
- respondent inicia resposta;
- respondent envia formulario;
- admin valida evidencia;
- admin solicita ajuste;
- admin invalida evidencia;
- sistema gera recomendacao;
- respondent cria acao;
- admin valida acao;
- sistema gera relatorio.

## Fluxo de Notificacoes

O sistema deve notificar:

- formulario publicado;
- prazo proximo;
- ajuste solicitado;
- evidencia invalidada;
- recomendacao aprovada;
- acao atrasada;
- acao validada;
- relatorio disponivel.

## Historico e Auditoria

Toda acao importante deve gerar historico.

Registrar:

- usuario;
- acao;
- entidade;
- valor anterior;
- novo valor;
- data e hora.

O historico deve ser:

- imutavel;
- somente leitura;
- rastreavel.
