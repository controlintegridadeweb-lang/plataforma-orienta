# Phase 0 - Freeze and Baseline (Orienta V2)

Este documento registra a Fase 0 da refatoracao para alinhamento com o documento mestre da V2.

## 1) Freeze de Escopo

Enquanto a migracao de regras oficiais nao for concluida, ficam congeladas novas features que alterem:

- respostas e validacoes (`answers`, `evidences`);
- geracao de recomendacoes;
- calculo e exibicao de FAMI;
- fluxo de status de formulario/recomendacao/plano;
- papeis/permissoes.

Permitido durante o freeze:

- correcoes criticas de bug sem ampliar escopo;
- refatoracoes mecanicas para convergencia de contrato;
- testes, observabilidade e documentação.

## 2) Fonte Oficial de Verdade

A fonte oficial para decisoes e validacao de conformidade e:

- `../architecture/MASTER_DOCUMENT_ORIENTA_V2.md`
- `../architecture/FLOW_OPERACIONAL.md`
- `../product/STATUS_RULES.md`
- `../product/FAMI_RULES.md`

## 3) Baseline Tecnico Capturado

- Data: 2026-05-28
- Comando: `npm test`
- Resultado: `45` arquivos de teste aprovados, `287` testes aprovados, `0` falhas.

## 4) Entregaveis da Fase 0

- checklist de conformidade oficial: `V2_CONFORMITY_CHECKLIST.md`
- matriz regra -> impacto em codigo: `V2_RULE_IMPACT_MATRIX.md`
- registro de freeze e baseline (este arquivo)

## 5) Criterio para sair da Fase 0

- checklist revisado e aceito;
- matriz de impacto priorizada;
- baseline de testes documentado (concluido);
- escopo da Fase 1 fechado (contratos canonicos).
