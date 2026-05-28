# V2 Conformity Checklist

Checklist de conformidade obrigatoria com a Orienta V2.

## A. Respostas Oficiais

- [ ] Sistema aceita apenas: `yes`, `no`, `not_applicable`.
- [ ] Nao existem valores de resposta legados em contratos de dominio, API, UI e banco.
- [ ] Nao existem cenarios/estados legados em regras ativas.

## B. Perfis Oficiais

- [ ] Perfis ativos apenas: `admin`, `respondent`.
- [ ] Nao existe perfil legado em auth, RLS, rotas e UI.

## C. Recomendacoes

- [ ] Recommendation nasce apenas quando `answer = no`.
- [ ] Recommendation nasce apenas quando `evidence.status = invalidated`.
- [ ] `adjustment_requested` nao dispara recommendation.
- [ ] Nao existe tipo ativo de recommendation para "implementacao parcial".

## D. FAMI

- [ ] Todas as perguntas possuem o mesmo peso.
- [ ] `not_applicable` fica fora do denominador.
- [ ] Escala de niveis: `0-20`, `21-40`, `41-60`, `61-80`, `81-100`.
- [ ] Nao existe FAMI pos plano de acao.

## E. Estados e Fluxos

- [ ] Estados de formulario aderentes ao `docs/STATUS_RULES.md`.
- [ ] Estados de acao aderentes ao `docs/STATUS_RULES.md`.
- [ ] Fluxo operacional aderente ao `docs/FLOW_OPERACIONAL.md`.
- [ ] Nao existem estados legados fora da lista oficial.

## F. Arquitetura

- [ ] Sem logica operacional enterrada na UI.
- [ ] Sem duplicacao de regra entre `components`, `app/api` e `lib`.
- [ ] Sem fallback que mascara erro de regra de dominio.

## G. Qualidade

- [ ] Testes unitarios atualizados para todas as regras oficiais.
- [ ] Testes de integracao cobrindo gatilhos de recommendation.
- [ ] Baseline de regressao executado antes e apos migracao.
