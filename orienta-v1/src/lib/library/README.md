# Biblioteca Geral

Modulo que centraliza os catalogos reutilizaveis da Plataforma Orienta
(Eixos, Secoes, Metricas, Recomendacoes-base e Acoes-modelo).

## Estrutura

- `types.ts`: tipos puros de dominio (sem dependencia de framework).
- `schemas.ts`: schemas Zod compartilhados entre UI, API e servico.
- `config.ts`: configuracao declarativa de colunas/campos por entidade
  para alimentar tabela e modal genericos.
- `repository.ts`: acesso ao Supabase (service role), isolado do resto do app.
- `service.ts`: orquestracao de create/update/delete com validacao Zod
  e traducao de erros do banco em erros de dominio.
- `http.ts`: adaptadores HTTP usados pelos route handlers.
- `client.ts`: gateway do browser (fetch) para consumo pela UI.
- `index.ts`: barrel file com a API publica do modulo.

## Pipeline de dados

```
UI (components/biblioteca)
  -> client.ts (fetch)
  -> route.ts (auth + http)
  -> service.ts (validacao + regra)
  -> repository.ts (supabase)
```

## Criterios de extracao para pacote compartilhado

O modulo esta pronto para extracao quando cumprir TODOS os criterios abaixo:

1. Nao depender de `next/*` em arquivos sob `types.ts`, `schemas.ts`,
   `config.ts` e `service.ts`.
2. Acesso a Supabase centralizado em `repository.ts` via injecao de
   cliente (construtor aceita client externo).
3. Schemas usados simultaneamente em UI e API sem duplicacao.
4. 100% dos erros de negocio classificados como `LibraryValidationError`
   ou `LibraryConflictError` antes de chegar a camada HTTP.
5. Barrel `index.ts` exportando apenas o que a aplicacao realmente consome.
6. Cobertura de testes para `schemas.ts` (tipos de dominio estaveis).

## Dependencias permitidas

| Arquivo         | Pode importar                                  |
|-----------------|------------------------------------------------|
| types.ts        | (nenhum)                                       |
| schemas.ts      | zod, ./types                                   |
| config.ts       | ./types                                        |
| repository.ts   | @supabase/*, @/lib/supabase/server, ./types, ./schemas |
| service.ts      | ./repository, ./schemas, ./types               |
| http.ts         | next/server, ./service, ./schemas, ./types     |
| client.ts       | ./types                                        |

## Especificacao oficial

A especificacao funcional, tecnica e operacional consolidada da
Biblioteca Geral V1 vive em
[`docs/biblioteca-geral`](../../../docs/biblioteca-geral/README.md),
incluindo dominio, governanca, versionamento, fluxos, regras de
disparo, checklist de qualidade, metricas de efetividade, criterios
de aceite e backlog tecnico.

## Estado atual (V1 implementada)

- Ondas 1..7 concluidas, com migrations `0002..0005` aplicaveis e suites
  de teste Vitest para schemas, service, binding e motor v2.
- Lifecycle completo via `LibraryService`
  (`submitForReview`, `publish`, `deprecate`, `archive`,
  `createNewVersion`) com auditoria em `library_item_versions`.
- Vinculo pergunta -> item em `question_library_binding` e snapshot
  imutavel em `form_question_library_snapshot` (via `BindingService` e
  `SnapshotService`).
- Motor `recommendation-engine-v2` com os 10 cenarios oficiais e
  `buildRecommendationFromSnapshot` alimentando
  `/api/recommendations/infer?useSnapshot=true`.
- UI evoluida em `src/components/biblioteca/` com filtros, menu de
  ciclo de vida e checklist de qualidade.
- Painel de efetividade em `/admin/biblioteca/efetividade` e fluxo de
  excecao institucional em `/api/admin/library/exceptions`.

## Modulos novos

| Arquivo                    | Responsabilidade                                       |
|----------------------------|--------------------------------------------------------|
| binding-types.ts           | Tipos dos cenarios oficiais e bindings.                |
| binding-schemas.ts         | Zod dos bindings.                                      |
| binding-service.ts         | CRUD + snapshot + validacao de cobertura.              |
| effectiveness-service.ts   | Leitura/escrita de `library_effectiveness_snapshots`.  |
| exceptions-service.ts      | CRUD de `recommendation_exceptions`.                   |

## Proximos passos sugeridos (pos-V1)

- Job agendado para popular `library_effectiveness_snapshots`.
- Extrair o pacote como workspace interno quando outros produtos
  reaproveitarem o dominio.
- Introduzir UI read-only para perfis administrativos org-scoped e diff visual entre versoes.
