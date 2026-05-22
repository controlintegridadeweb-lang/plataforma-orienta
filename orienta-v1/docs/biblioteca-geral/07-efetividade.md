# 07 — Efetividade da Biblioteca e governanca orientada por dados

A Biblioteca evolui com base em evidencias de uso. Este documento
define as metricas, indicadores consolidados, faixas de referencia e
ritual de revisao.

## Principios

- Cada recomendacao-base e acao-modelo tem ciclo de vida mensuravel.
- Metricas sao calculadas sempre com base em snapshots, garantindo
  comparabilidade historica.
- Metricas sao visiveis no painel administrativo e exportaveis para
  auditoria.

## Metricas obrigatorias

### A. Metricas por recomendacao-base

| Metrica | Definicao | Uso |
|---|---|---|
| Taxa de disparo | `disparos / formularios_respondidos` no periodo. | Identificar recomendacoes mais/menos acionadas. |
| Taxa de manutencao | `% de disparos em que o texto foi editado pelo analista`. | Alto valor sugere problema de redacao. |
| Taxa de excecao | `% de disparos que terminaram em excecao institucional`. | Alto valor sugere escopo de aplicacao ruim. |
| Tempo medio de fechamento | Tempo medio entre geracao da recomendacao e conclusao das acoes correspondentes. | Eficacia pratica. |
| Cobertura de acao-modelo | `% de disparos em que ao menos uma acao-modelo foi aceita no plano`. | Qualidade da sugestao. |

### B. Metricas por acao-modelo

| Metrica | Definicao |
|---|---|
| Taxa de adesao | `% das vezes em que a acao-modelo sugerida foi inserida no plano`. |
| Taxa de edicao | `% das vezes em que a acao foi editada antes da inclusao`. |
| Taxa de conclusao | `% das acoes modelo inseridas que chegaram a status `Concluída`. |
| Tempo medio de conclusao | Dias entre inclusao e conclusao. |

### C. Metricas por metrica analitica

| Metrica | Definicao |
|---|---|
| Cobertura de uso | `% de perguntas da Biblioteca que ja apontam para esta metrica`. |
| Taxa de disparo efetivo | `% de respostas que caem no cenario de nao conformidade associado`. |

### D. Metricas de biblioteca agregada

| Metrica | Definicao |
|---|---|
| Indice de saude | Composto: cobertura de cenarios em perguntas publicadas x taxa de edicao manual x taxa de conclusao de acoes x tempo medio de fechamento. |
| Percentual de itens ativos | `published / total` por tipo. |
| Percentual de itens deprecados | `deprecated / published` por tipo. |
| Itens publicados sem uso no periodo | Recomendacoes-base ou acoes-modelo sem disparo no intervalo. |
| Itens candidatos a revisao | Itens com `taxa_manutencao > limiar` ou `taxa_conclusao < limiar`. |

## Faixas de referencia sugeridas (V1)

| Metrica | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Taxa de manutencao de recomendacao | <= 10% | 10-25% | > 25% |
| Taxa de excecao | <= 5% | 5-15% | > 15% |
| Taxa de adesao a acao-modelo | >= 70% | 40-70% | < 40% |
| Taxa de conclusao de acao | >= 50% | 25-50% | < 25% |
| Tempo medio de fechamento (dias) | <= 60 | 60-180 | > 180 |

Faixas sao configuraveis por Administrador e fazem parte da politica
institucional. Mudancas sao auditadas.

## Alertas automaticos

- Recomendacao com 3 medicoes consecutivas no vermelho em `taxa de
  manutencao` entra na fila de revisao.
- Acao-modelo com `taxa de adesao < 20%` por 2 medicoes vai para
  analise de substituicao.
- Item sem disparo em 12 meses vai para lista de candidatos a
  depreciacao.

## Ritual de evolucao trimestral

Recomendado (nao obrigatorio na V1):

1. Administrador e revisor tecnico revisam o painel de efetividade.
2. Marcam itens para `in_review` e designam autores.
3. Criam `draft` com mudancas planejadas.
4. Publicacao segue o fluxo oficial com checklist de qualidade.
5. Itens nao recuperaveis entram no fluxo de depreciacao.

## Exportacao para auditoria

Relatorio exportavel contendo:

- parametros do periodo,
- metricas consolidadas,
- lista de itens em revisao, deprecados e arquivados,
- hash da biblioteca no fim do periodo.

Formato: PDF (oficial) e CSV (complementar). Emissao e autorizada para
Administrador.

## Relacao com o FAMI

O calculo do FAMI nao depende destas metricas. Elas existem para
guiar a evolucao da Biblioteca e a qualidade do processo. FAMI
continua sendo calculado conforme documento da V1 (pesos 1,5 / 1,0 /
fora do calculo).
