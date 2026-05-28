# Guia rapido — Biblioteca Geral (perfil Administrador)

Este guia resume o passo-a-passo esperado do administrador de platform
para operar a Biblioteca Geral V1 apos a conclusao das Ondas 1..7.

## 1. Preparar o banco

Aplicar na ordem:

1. `0001_orienta_v1.sql` — base do dominio.
2. `0002_biblioteca_geral.sql` — tabelas library\_\*.
3. `0003_biblioteca_geral_extensao.sql` — status, versao, tags, historico.
4. `0004_question_library_binding.sql` — bindings e snapshots.
5. `0005_biblioteca_efetividade.sql` — efetividade e excecoes.

Instrucoes detalhadas em
[INSTRUCOES-MIGRATION-0002.md](./INSTRUCOES-MIGRATION-0002.md). Demais
migrations seguem o mesmo fluxo (Studio, CLI ou psql).

## 2. Cadastrar taxonomia inicial

1. Acesse `/admin/biblioteca`.
2. Em "Eixos", crie os eixos institucionais. V1 opera com os tres
   eixos fechados definidos em `01-dominio.md`: Governanca, Ambiental
   e Social. Novos eixos exigem decisao institucional formal.
3. Em "Secoes", ligue cada secao a um eixo. O `code` e gerado
   automaticamente a partir do eixo; ajuste manual so em Opcoes
   avancadas quando houver padrao institucional obrigatorio.
4. Em "Metricas", vincule metricas a uma `severidade padrao`
   (severity\_hint).
5. Em "Recomendacoes", separe `textoBaseFixo` (normativo) do
   `textoBaseParametrizavel` (usando `{{variaveis}}`).
6. Em "Acoes-modelo", informe criterios de conclusao e area
   responsavel sugerida.

A tabela traz filtros por status, tag e texto.

## 3. Ciclo de vida

Use os botoes `Enviar para revisao → Publicar → Depreciar → Arquivar`
ao lado de cada item. O motor exige justificativa >= 5 caracteres para
`Publicar` e `Depreciar`. Ao publicar, o sistema:

- grava uma nova linha em `library_item_versions` com hash determinista.
- encerra a versao anterior (`vigente_ate`).
- loga eventos `library.item.published`.

## 4. Vincular perguntas ao formulario

Para cada pergunta:

- Selecione `axisId`, `sectionId`, `metricId`.
- Para cada cenario da matriz oficial (ver `05-regras-disparo.md`),
  escolha uma recomendacao-base e opcionalmente uma lista de
  acoes-modelo, severidade e nota.
- O sistema calcula `coverage_score` e bloqueia publicacao de
  formulario se os cenarios obrigatorios nao estiverem cobertos:
  `nao, nao_se_aplica, sim_evidencia_invalida`
  (fonte canonica: `LIBRARY_REQUIRED_SCENARIOS` em
  `binding-types.ts`).

Endpoint: `PUT /api/admin/forms/:formId/questions/:questionId/binding`.

## 5. Publicar formulario com snapshot

`POST /api/admin/forms/:formId/publish` executa o `SnapshotService`,
captura a versao atual de cada item da biblioteca e grava em
`form_question_library_snapshot`. A resposta traz a contagem de
snapshots e bloqueia com 409 se houver pendencias.

## 6. Motor de recomendacoes (tempo de resposta)

A rota `POST /api/recommendations/infer` aceita dois modos:

- Legado (payload minimo, resposta `recommendationType`).
- `useSnapshot: true` (novo): consome o snapshot da pergunta +
  resposta e devolve `recommendation` com
  `scenario, confidenceScore, renderedText, recommendationVersionId,
  actionVersionIds, snapshotHash, ruleVersion`.

## 7. Monitorar efetividade

- Pagina `/admin/biblioteca/efetividade` para faixas verde/ambar/vermelho.
- Endpoint de leitura: `GET /api/admin/library/effectiveness` com
  filtros `itemType, periodStart, periodEnd`.
- Snapshots podem ser registrados via `EffectivenessService` em jobs
  agendados (recomenda-se quinzenal/mensal).

## 8. Excecoes institucionais

- Respondente solicita via `POST /api/admin/library/exceptions` com
  motivo >= 20 caracteres.
- Admin decide via `PATCH /api/admin/library/exceptions/:id`.
- Listagem por organizacao via `GET /api/admin/library/exceptions?organizationId=…`.

## 9. Playbook trimestral

1. Gerar `library_effectiveness_snapshots` do periodo.
2. Revisar itens em vermelho (baixa confianca ou alta rejeicao).
3. Publicar nova versao (`createNewVersion`) com ajustes.
4. Atualizar docs e comunicar ao time.

## 10. Testes e homologacao

- `npm run test` executa as suites unitarias (schemas, service,
  binding, motor v2).
- Cada onda possui critereos de aceite em
  [08-criterios-aceite.md](./08-criterios-aceite.md).
- Manter logs estruturados `library.*` no Cloud/Vercel para auditoria.
