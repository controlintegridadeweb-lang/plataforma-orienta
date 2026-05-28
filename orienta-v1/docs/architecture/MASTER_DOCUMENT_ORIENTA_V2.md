# MASTER DOCUMENT ORIENTA V2

Documento consolidado contendo todas as definicoes funcionais, operacionais, arquiteturais, tecnicas, visuais e estruturais da Plataforma Orienta V2.

## Visao Geral

A Plataforma Orienta V2 sera um sistema de diagnostico operacional e gestao de maturidade organizacional voltado para:

- aplicacao de formularios;
- coleta e validacao de evidencias;
- geracao de recomendacoes;
- criacao de planos de acao;
- monitoramento operacional;
- geracao de relatorios;
- calculo de maturidade FAMI.

A plataforma deve priorizar:

- clareza operacional;
- simplicidade;
- rastreabilidade;
- modularidade;
- escalabilidade;
- consistencia visual;
- reducao de carga cognitiva.

## Objetivo da Refatoracao

A V2 nasce para corrigir:

- estrutura confusa;
- excesso de telas;
- logica duplicada;
- componentes gigantes;
- falta de padronizacao;
- mistura entre UI e regra operacional;
- multiplos fluxos paralelos;
- excesso de acoplamento;
- dificuldade de manutencao;
- ausencia de hierarquia operacional.

## Principios Estruturais

Principios oficiais:

- separacao de responsabilidades;
- fluxo linear;
- modularidade;
- rastreabilidade;
- clareza operacional;
- consistencia de estados;
- padronizacao visual;
- reducao de complexidade tecnica.

## Perfis Oficiais

Perfis permitidos:

- admin
- respondent

Admin:

- cria formularios;
- publica formularios;
- valida evidencias;
- revisa recomendacoes;
- acompanha monitoramento;
- valida acoes;
- gera relatorios;
- visualiza auditoria.

Respondent:

- responde formularios;
- envia evidencias;
- corrige ajustes;
- cria plano de acao;
- executa acoes;
- atualiza monitoramento.

## Eixos Oficiais

Eixos fixos:

- Governanca
- Ambiental
- Social

Estrutura:
Eixo -> Secao -> Pergunta

## Mapa Oficial de Telas

Modulos:

- Dashboard
- Formularios
- Respostas
- Evidencias
- Recomendacoes
- Plano de acao
- Monitoramento
- Relatorios
- Historico
- Configuracoes

## Tela Central da Plataforma

Tela principal:
Detalhe do Ciclo de Diagnostico

Ela deve reunir:

- respostas;
- evidencias;
- FAMI;
- recomendacoes;
- plano de acao;
- monitoramento;
- relatorio;
- historico.

## Identidade Visual

Paleta principal:

- Verde institucional: #16998F
- Laranja institucional: #E59A5C
- Fundo claro: #F5F5F5
- Texto principal: #0F172A
- Texto secundario: #475569

A logo oficial da Orienta deve ser utilizada:

- login;
- header;
- relatorios;
- PDFs;
- comunicacao institucional.

## Assets

Estrutura oficial:

`src/assets/`
`logos/`
`icons/`
`images/`
`illustrations/`

A logo deve ser incorporada ao codigo.

## Modulos Oficiais

Modulos:

- auth
- forms
- assignments
- answers
- evidences
- validations
- recommendations
- action-plans
- monitoring
- reports
- notifications
- fami
- audit

## Regra Central da Orienta V2

A Plataforma Orienta V2 nao e apenas um sistema de formularios.
Ela e um sistema de:

Diagnostico
↓
Identificacao da nao conformidade
↓
Correcao operacional
↓
Monitoramento
↓
Gestao da maturidade organizacional
