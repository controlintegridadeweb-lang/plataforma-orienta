# 09 — Backlog tecnico derivado

Backlog inicial de implementacao da Biblioteca Geral V1, derivado da
especificacao. Cada epico lista as entregas esperadas e suas
dependencias.

Prioridades: `must` (MVP V1), `should` (pos-MVP imediato),
`could` (V1.1 / Maturidade Avancada).

## Epico E1 — Modelagem de banco

- M1.1 `must` — Migracao estendendo tabelas `library_*` com
  `status`, `version_major/minor/patch`, `version`, `vigente_de`,
  `vigente_ate`, `tags`, `created_by`, `updated_by`, `approved_by`,
  `approved_at`, `deprecated_by`, `deprecated_at`.
- M1.2 `must` — Novos campos especificos:
  - `library_metrics`: `severity_hint`, `trigger_summary`, `description`.
  - `library_recommendations`: `tipo`, `texto_base_fixo`,
    `texto_base_parametrizavel`, `variaveis_parametro`,
    `fundamento_tecnico`, `escopo_aplicacao`.
  - `library_actions`: `suggested_priority`,
    `suggested_responsible_area`, `fundamento_tecnico`,
    `criterio_conclusao`.
- M1.3 `must` — Tabela `library_item_versions` (historico imutavel).
- M1.4 `must` — Tabela associativa `library_recommendation_actions`.
- M1.5 `must` — Tabela `question_library_binding` com `bindings` jsonb
  indexado.
- M1.6 `must` — Tabela `form_question_library_snapshot` para snapshots.
- M1.7 `must` — Indices por `status`, `version`, `tags` GIN.
- M1.8 `should` — Tabela `library_vocabulary_tags` para vocabulario
  controlado.
- M1.9 `should` — Tabela `library_effectiveness_metrics` (materializada
  ou calculada sob demanda).

Dependencias: nenhum. Abre caminho para os demais epicos.

## Epico E2 — Tipos e schemas (TypeScript + Zod)

- E2.1 `must` — Estender `src/lib/library/types.ts` com todos os
  campos novos (status, versao, vigencia, audit, tags e campos
  especificos por tipo).
- E2.2 `must` — Ampliar `src/lib/library/schemas.ts` com regras de
  validacao de variaveis parametrizaveis, tags do vocabulario,
  cenarios de binding.
- E2.3 `must` — Novo schema `questionLibraryBindingSchema`
  (validando `bindings` e cobertura minima).
- E2.4 `must` — Novo tipo `LibraryItemVersion` e
  `FormQuestionLibrarySnapshot`.
- E2.5 `should` — Exportar via `src/lib/library/index.ts` apenas o que
  outros modulos consomem.

Dependencias: E1.

## Epico E3 — Repositorio e servico

- E3.1 `must` — Ampliar `repository.ts` para CRUD com novos campos e
  leitura do historico.
- E3.2 `must` — Metodos `submitForReview`, `approveReview`,
  `publish`, `deprecate`, `archive` com validacoes e eventos.
- E3.3 `must` — `service.ts` aplicando regras de transicao e geracao
  de versao automatica (com nivel sugerido).
- E3.4 `must` — `BindingService` para CRUD de
  `question_library_binding` + validacao de cobertura minima.
- E3.5 `must` — `SnapshotService` para geracao de snapshot no momento
  da publicacao de formulario.
- E3.6 `should` — Servico de deduplicacao/conflict-resolution para
  disparo de recomendacoes.
- E3.7 `should` — Servico de excecao institucional.

Dependencias: E1, E2.

## Epico E4 — APIs internas (Next.js route handlers)

- E4.1 `must` — `/api/admin/library/[entity]` com suporte a listar,
  criar e atualizar com campos novos.
- E4.2 `must` — Endpoints de transicao: `submit-review`,
  `approve`, `publish`, `deprecate`, `archive`.
- E4.3 `must` — `/api/admin/forms/[id]/bindings` para manipulacao de
  `question_library_binding`.
- E4.4 `must` — `/api/admin/forms/[id]/publish` que dispara snapshot.
- E4.5 `must` — Endpoint de leitura de efetividade
  (`/api/admin/library/effectiveness`) com filtros.
- E4.6 `should` — Endpoint para pacote de regressao oficial.

Dependencias: E3.

## Epico E5 — Motor de recomendacoes

- E5.1 `must` — Refatorar inferencia de recomendacoes para ler o
  snapshot da pergunta em vez da biblioteca viva.
- E5.2 `must` — Implementar resolucao de cenario de resposta conforme
  matriz em `05-regras-disparo.md`.
- E5.3 `must` — Implementar aplicacao de variaveis de parametrizacao
  no texto gerado.
- E5.4 `must` — Persistir `confidence_score`, `rule_version`,
  `snapshot_hash`.
- E5.5 `must` — Idempotencia em reprocessamento.
- E5.6 `should` — Sugestao automatica de acoes-modelo no Plano de
  Acao.

Dependencias: E3, E4.

## Epico E6 — UI administrativa

- E6.1 `must` — Ampliar `src/components/biblioteca/entity-modal.tsx`
  com campos novos por tipo.
- E6.2 `must` — Tabela com filtros de status, versao, tags.
- E6.3 `must` — Tela de detalhe do item com linha do tempo de versoes.
- E6.4 `must` — Editor de vinculos da pergunta com matriz de cenarios
  e validador visual de cobertura minima.
- E6.5 `must` — Tela de publicacao de formulario com listagem de
  pendencias.
- E6.6 `should` — Painel de efetividade com faixas
  verde/amarelo/vermelho.
- E6.7 `could` — Tela de excecoes institucionais por orgao.

Dependencias: E4.

## Epico E7 — Auditoria e observabilidade

- E7.1 `must` — Eventos oficiais (ver 04) emitidos via
  `src/lib/observability/logger.ts`.
- E7.2 `must` — Diffs calculados automaticamente em transicoes.
- E7.3 `should` — Painel de trilha de auditoria filtravel por tipo de
  evento.

Dependencias: E3.

## Epico E8 — Testes

- E8.1 `must` — Unit tests para `schemas.ts` cobrindo todos os novos
  campos e regras (esqueleto ja em
  `src/lib/library/schemas.test.ts`).
- E8.2 `must` — Unit tests para `service.ts` (transicoes e
  deduplicacao).
- E8.3 `must` — Unit tests para motor de recomendacoes com os 8
  cenarios.
- E8.4 `must` — Teste de integracao: criar item, publicar, gerar
  snapshot, reprocessar, depreciar, reconstituir historico.
- E8.5 `should` — Pacote de regressao oficial rodando em CI.

Dependencias: demais epicos correspondentes.

## Epico E9 — Documentacao e treinamento

- E9.1 `must` — Atualizar `src/lib/library/README.md` apontando para
  esta pasta.
- E9.2 `must` — Guia de uso para administradores (criar, publicar,
  deprecar).
- E9.3 `should` — Guia editorial de linguagem (recomendacoes e acoes).
- E9.4 `could` — Video tutorial / onboarding institucional.

Dependencias: texto produzido na especificacao.

## Dependencias externas

- Modulo de formularios: precisa expor a pergunta com os campos
  necessarios para o binding (tipo, exige_comprovacao, participa_fami,
  perfis aplicaveis).
- Modulo FAMI: ja calcula pesos 1,5/1,0/0; a Biblioteca nao muda esse
  calculo.
- Relatorio oficial: deve incluir no diagnostico as recomendacoes
  geradas com `snapshot_hash` e versoes referenciadas.

## Ordem de execucao sugerida

1. E1 -> E2 (fundacao).
2. E3 (logica).
3. E4 (exposicao).
4. E5 (motor) e E6 (UI) em paralelo.
5. E7 (auditoria) transversal, preenchido conforme E3 e E4 evoluem.
6. E8 (testes) acompanha cada epico.
7. E9 (docs) no final de cada entrega.
