# 06 — Checklist de qualidade minima da recomendacao-base

Antes de publicar uma recomendacao-base, o sistema exige 100% de
atendimento deste checklist. A publicacao so ocorre com todos os itens
em `ok` e com justificativa/aprovador registrados.

O checklist e exigido tambem em versoes `major` novas (edicoes que
alteram semantica). Em `minor` e `patch`, o revisor pode declarar que
itens nao afetados permanecem validos, mantendo o registro da versao
anterior.

## Itens do checklist

### 1. Completude de campos obrigatorios
- `title`, `tipo`, `priority_default`, `texto_base_fixo`,
  `texto_base_parametrizavel`, `variaveis_parametro`,
  `fundamento_tecnico`, `escopo_aplicacao` preenchidos.
- Tags dentro do vocabulario controlado.

### 2. Consistencia das variaveis parametrizaveis
- Toda variavel presente em `texto_base_parametrizavel` esta declarada
  em `variaveis_parametro`.
- Toda variavel declarada como `required = true` possui `label` claro
  e exemplo/valor padrao sugerido.
- Nao ha placeholders quebrados ou duplicados.

### 3. Clareza de linguagem
- Texto institucional usa linguagem formal, impessoal e objetiva.
- Evita jargao interno sem definicao.
- Explicita claramente qual e a acao esperada do orgao.

### 4. Base normativa explicita
- `fundamento_tecnico` cita norma, politica ou referencia tecnica
  aplicavel.
- Se houver norma com numero/data, estao indicados.

### 5. Escopo de aplicacao claro
- `escopo_aplicacao` descreve o contexto em que a recomendacao deve
  disparar (tipos de orgao, maturidade institucional etc.).
- Permite ao admin decidir quando uma excecao e cabivel.

### 6. Acao-modelo associada (quando exigido)
- Para tipo `nao_implementacao` existe pelo
  menos uma acao-modelo vinculada.
- Cada acao vinculada tem `criterio_conclusao` preenchido.

### 7. Teste de disparo em homologacao
- Regressao automatica executada com pacote de casos oficiais (ver 08).
- Nenhum caso critico quebrado.

### 8. Aprovadores e justificativa
- Revisor tecnico (admin) diferente do autor quando aplicavel.
- Aprovador institucional (Administrador) indicado.
- Justificativa da publicacao registrada.

### 9. Compatibilidade com a politica editorial
- Verbo de acao no inicio da sugestao (ex.: "Elaborar", "Publicar",
  "Institucionalizar").
- Indicacao de prazo sugerido ou referencia de prazo.
- Indicacao de responsavel ou area esperada.
- Criterio de verificacao mensuravel.

### 10. Impacto em formularios publicados
- Revisor confirma que alteracao nao afeta snapshots ja emitidos
  (versao anterior permanece valida para formularios antigos).
- Caso a alteracao seja `major`, campo de compatibilidade com
  formularios em andamento foi considerado.

## Registro do checklist

Cada execucao do checklist gera um registro com:

- `recommendation_id`, `version`,
- lista de itens com status `ok | warning | fail`,
- comentarios por item (texto livre),
- autor do checklist,
- aprovador final,
- `passed_at` ou motivo de rejeicao.

Esse registro fica anexado ao evento de auditoria
`library.recommendation.quality_checked` e aparece no detalhe da
recomendacao para historico.

## Politica editorial (resumo)

Para manter consistencia entre administradores:

- Titulos no imperativo: "Elaborar politica de...", "Institucionalizar
  processo de...".
- Texto institucional no singular, impessoal ("o orgao deve...").
- Acoes-modelo com verbo no infinitivo e escopo delimitado.
- Prazos sugeridos sempre em dias corridos, alinhados ao campo
  `suggested_deadline_days` da acao-modelo.
- Evidencia esperada descrita no `fundamento_tecnico` ou em campo
  complementar, quando aplicavel.
