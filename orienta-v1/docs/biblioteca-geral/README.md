# Biblioteca Geral V1 — Especificacao consolidada

Nucleo reutilizavel da Plataforma Orienta. Esta pasta contem a
especificacao funcional, tecnica e operacional da Biblioteca Geral,
conforme o plano aprovado em `.cursor/plans/biblioteca_geral_v1_*.plan.md`.

Escopo desta etapa: definicoes, regras e backlog. Implementacao de telas
e integracoes externas fica fora desta entrega.

## Itens cobertos

- Eixos
- Secoes
- Metricas analiticas
- Recomendacoes-base
- Acoes-modelo

## Estrutura dos documentos

| Arquivo | Conteudo |
|---|---|
| [01-dominio.md](01-dominio.md) | Modelo de dominio, campos minimos e invariantes por tipo. |
| [02-governanca.md](02-governanca.md) | Ciclo de vida, permissoes por perfil e regras de aprovacao. |
| [03-versionamento.md](03-versionamento.md) | Versionamento por item, snapshot e compatibilidade com formularios. |
| [04-fluxos.md](04-fluxos.md) | Fluxos operacionais obrigatorios com gatilho, atores e auditoria. |
| [05-regras-disparo.md](05-regras-disparo.md) | Regras de disparo por cenario de resposta (modelo por pergunta). |
| [06-qualidade-recomendacao.md](06-qualidade-recomendacao.md) | Checklist de qualidade minima para publicacao. |
| [07-efetividade.md](07-efetividade.md) | Metricas de efetividade e governanca orientada por dados. |
| [08-criterios-aceite.md](08-criterios-aceite.md) | Criterios de aceite testaveis para homologacao. |
| [09-backlog.md](09-backlog.md) | Backlog tecnico derivado desta especificacao. |
| [10-guia-admin.md](10-guia-admin.md) | Guia operacional do administrador (passo a passo pos-implementacao). |

## Principios

- Toda pergunta de formulario nasce vinculada a itens da Biblioteca.
- Publicacao de formulario exige vinculos minimos e regras de disparo completos.
- Formulario publicado usa snapshot imutavel das versoes vigentes da Biblioteca.
- Toda alteracao relevante gera trilha de auditoria com valores anterior e posterior.
- Recomendacao-base so vai para producao apos checklist de qualidade 100% atendido.

## Fontes canonicas (evitar divergencia)

Para garantir consistencia documento x codigo, cada conceito tem uma
fonte unica. Demais documentos devem referenciar, nao redeclarar.

| Conceito | Fonte canonica |
|---|---|
| Eixos institucionais V1 (Governanca, Ambiental, Social) | [01-dominio.md](01-dominio.md) |
| Ciclo de vida e transicoes de status | [02-governanca.md](02-governanca.md) |
| Versao inicial (`0.1.0`) e regras de semver | [03-versionamento.md](03-versionamento.md) + [04-fluxos.md](04-fluxos.md) fluxo 1 |
| Papeis por acao (publicar = Administrador) | [02-governanca.md](02-governanca.md) e [04-fluxos.md](04-fluxos.md) |
| Chaves de cenarios (`nao`, `parcialmente`, `sim_sem_evidencia`, `sim_evidencia_invalida`, ...) | [05-regras-disparo.md](05-regras-disparo.md) + `src/lib/library/binding-types.ts` |
| Cenarios obrigatorios para publicacao de formulario | `LIBRARY_REQUIRED_SCENARIOS` em `binding-types.ts` (espelhado em 05) |
| Classificacao de efetividade (verde/ambar/vermelho) | [07-efetividade.md](07-efetividade.md) |

Se um documento precisar falar sobre um desses conceitos, deve linkar
para a fonte canonica e nao duplicar a definicao.
