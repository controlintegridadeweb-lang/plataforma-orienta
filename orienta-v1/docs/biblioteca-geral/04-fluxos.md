# 04 — Fluxos operacionais obrigatorios

Cada fluxo descreve: gatilho, atores, pre-condicoes, passos,
validacoes, resultado e eventos de auditoria. Os estados referenciados
estao em [02-governanca.md](02-governanca.md) e o versionamento em
[03-versionamento.md](03-versionamento.md).

## Fluxo 1 — Criacao de item reutilizavel

- Gatilho: usuario abre painel administrativo e aciona "Novo item".
- Atores: Administrador.
- Pre-condicoes: usuario autenticado com permissao de criacao.
- Passos:
  1. Seleciona tipo (`axis | section | metric | recommendation | action`).
  2. Preenche campos obrigatorios do tipo (ver 01).
  3. Salva como `draft`.
- Validacoes: schema Zod do tipo correspondente; `code` unico por tipo.
- Resultado: registro em `library_*` com `status = draft` e `version = 0.1.0`.
- Auditoria: evento `library.item.created` com payload completo.

## Fluxo 2 — Revisao e aprovacao

- Gatilho: autor submete item `draft` para revisao.
- Atores: autor + revisor (outro usuario com perfil adequado).
- Passos:
  1. Autor aciona "Submeter para revisao".
  2. Sistema valida regras da transicao `draft -> in_review` (02).
  3. Revisor analisa e aciona "Aprovar" ou "Devolver".
  4. Em "Devolver", revisor anexa justificativa e item volta a `draft`.
- Validacoes:
  - Revisor diferente do autor quando o tipo exigir dupla etapa.
  - Justificativa obrigatoria em devolucao.
- Resultado:
  - Em aprovacao: item fica elegivel ao Fluxo 3 (publicacao).
  - Em devolucao: `status = draft` e log de devolucao.
- Auditoria:
  - `library.item.submitted_to_review`.
  - `library.item.review_returned` ou `library.item.review_approved`.

## Fluxo 3 — Publicacao

- Gatilho: item em `in_review` aprovado.
- Atores: Administrador (aprovador institucional).
- Passos:
  1. Administrador confirma publicacao.
  2. Sistema executa validacoes da transicao `in_review -> published`
     (checklist de qualidade se for recomendacao-base; variaveis
     parametrizaveis consistentes; etc.).
  3. Define `version` final (`0.1.0` na primeira publicacao ou a
     proxima conforme tipo de alteracao) e `vigente_de`.
  4. Cria registro em `library_item_versions` (historico imutavel).
- Validacoes: ver 02 e 06.
- Resultado: item com `status = published`, visivel para vinculo em
  formularios.
- Auditoria: `library.item.published` com `version`, `approved_by` e
  `justification`.

## Fluxo 4 — Atualizacao versionada

- Gatilho: usuario abre item `published` e aciona "Nova versao".
- Atores: Administrador.
- Passos:
  1. Sistema clona o payload da versao vigente criando `draft` derivado.
  2. Autor edita campos.
  3. Sistema calcula nivel sugerido (`major | minor | patch`) com base
     nos campos alterados (regra declarativa, revisavel pelo autor).
  4. Segue Fluxos 2 e 3.
- Validacoes: as mesmas da publicacao; manutencao do `code`.
- Resultado: nova linha em `library_item_versions` com
  `previous_version_id` apontando para a versao anterior.
- Auditoria: `library.item.new_version_drafted`,
  `library.item.new_version_published`.

## Fluxo 5 — Depreciacao e arquivamento

- Gatilho: Administrador decide descontinuar um item.
- Atores: Administrador.
- Passos:
  1. Aciona "Deprecar".
  2. Informa motivo e sugestao de substituto.
  3. Sistema marca `status = deprecated` e define `deprecated_at`.
  4. Apos periodo minimo, Administrador pode "Arquivar".
- Validacoes:
  - Depreciacao bloqueada se houver rascunho de formulario em aberto
    que dependa exclusivamente do item sem substituto declarado.
  - Arquivamento bloqueado se houver qualquer referencia ativa.
- Resultado: catalogo administrativo filtra itens ativos e ocultos
  separadamente; snapshots ja emitidos permanecem inalterados.
- Auditoria: `library.item.deprecated`, `library.item.archived`.

## Fluxo 6 — Vinculacao da pergunta aos itens da Biblioteca

- Gatilho: editor de formularios cria ou edita uma pergunta.
- Atores: Administrador.
- Passos:
  1. Seleciona eixo e secao (heranca obrigatoria).
  2. Seleciona metrica analitica.
  3. Informa, para cada cenario de resposta aplicavel, as regras de
     disparo: recomendacao-base, prioridade sugerida e acoes-modelo
     sugeridas (ver [05-regras-disparo.md](05-regras-disparo.md)).
  4. Sistema calcula cobertura de cenarios e sinaliza pendencias.
- Validacoes:
  - Todos os cenarios aplicaveis mapeados.
  - Itens vinculados estao `published` e vigentes.
- Resultado: registro em `question_library_binding`.
- Auditoria: `form.question.binding_updated` com diff das regras.

## Fluxo 7 — Publicacao de formulario (snapshot da Biblioteca)

- Gatilho: Administrador aciona "Publicar formulario".
- Atores: Administrador.
- Passos:
  1. Sistema valida que todas as perguntas tem vinculos minimos e regras
     de disparo completas (ver 05).
  2. Sistema lista as versoes vigentes de cada item vinculado.
  3. Sistema grava snapshot em `form_question_library_snapshot` para
     cada pergunta.
  4. Publica o formulario com `form_version`.
- Validacoes: bloqueio se houver qualquer pendencia de vinculo.
- Resultado: formulario publicado com snapshot imutavel.
- Auditoria: `form.published` com `form_version_id` e `snapshot_hash`.

## Fluxo 8 — Disparo de recomendacao no envio da resposta

- Gatilho: respondente envia formalmente o formulario ou admin
  altera status de evidencia.
- Atores: sistema (motor de recomendacoes).
- Passos:
  1. Para cada resposta, determinar o cenario aplicavel (ver 05).
  2. Ler o snapshot da pergunta (`form_question_library_snapshot`).
  3. Resolver as regras de disparo do cenario e gerar a(s)
     recomendacao(oes) no portfolio.
  4. Sugerir acoes-modelo vinculadas no Plano de Acao.
  5. Aplicar deduplicacao e conflito (ver 03).
- Validacoes:
  - Cenario encontrado no snapshot.
  - Item ainda valido dentro do snapshot (imutavel).
- Resultado: portfolio atualizado de forma idempotente.
- Auditoria: `recommendation.generated`, `action.model.suggested`,
  contendo `rule_version` e `snapshot_hash`.

## Fluxo 9 — Validacao de qualidade da recomendacao antes da publicacao

- Gatilho: Administrador solicita publicacao de recomendacao-base em
  `in_review` (conforme Fluxo 3).
- Atores: Administrador (revisao tecnica e aprovacao institucional).
- Passos:
  1. Sistema aplica o checklist de qualidade (ver 06).
  2. Sistema exige justificativa e aprovador (Administrador).
  3. Se algum item falhar, bloqueia a publicacao e lista os problemas.
- Validacoes: todos os itens do checklist com status `ok`.
- Resultado: publicacao segue o Fluxo 3 com registro do checklist.
- Auditoria: `library.recommendation.quality_checked`.

## Fluxo 10 — Monitoramento de efetividade

- Gatilho: rotina diaria ou abertura do painel de governanca.
- Atores: Administrador (consumo), sistema (calculo).
- Passos:
  1. Calcula metricas definidas em [07-efetividade.md](07-efetividade.md).
  2. Gera alertas quando indicadores saem das faixas de referencia.
- Resultado: painel com indicadores e lista de itens candidatos a
  revisao ou depreciacao.
- Auditoria: `library.effectiveness.calculated` com hash do relatorio.

## Fluxo 11 — Excecao institucional por orgao

- Gatilho: respondente/admin registra excecao a uma recomendacao
  gerada.
- Atores: respondente (abertura) + aprovador institucional.
- Passos:
  1. Respondente cria excecao com motivo, prazo e documento.
  2. Aprovador institucional (Administrador) aprova ou rejeita.
  3. Sistema marca a recomendacao como `em_excecao` ate o prazo.
- Validacoes: prazo positivo; arquivo anexo quando exigido; dentro da
  politica do orgao.
- Auditoria: `recommendation.exception.opened`,
  `recommendation.exception.decided`,
  `recommendation.exception.expired`.

## Fluxo 12 — Reprocessamento e reabertura

- Gatilho: mudanca relevante de validacao, nova evidencia ou reabertura
  administrativa.
- Atores: sistema + Administrador (no caso de reabertura).
- Passos:
  1. Sistema identifica o snapshot original.
  2. Executa o Fluxo 8 sobre o mesmo snapshot.
  3. Em reabertura, Administrador pode optar por "atualizar snapshot"
     (acao explicita), criando nova versao de processamento.
- Validacoes: mesma logica de deduplicacao; justificativa obrigatoria
  em reabertura.
- Auditoria: `form.reprocessed`, `form.reopened`.
