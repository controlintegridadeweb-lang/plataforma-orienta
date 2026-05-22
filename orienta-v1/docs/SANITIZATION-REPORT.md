# Relatorio de sanitizacao — Plataforma Orienta (`orienta-v1`)

Data de aplicacao: 2026-05-07. Plano: sanitizacao incremental em 7 fases (codigo, tipos, ESLint, pastas, config, seguranca, relatorio).

## Validacao executada

```bash
npm run lint
npm run test
npm run build
```

Última rodada: testes 122/122 passando; build de producao concluído.

---

## 1. Itens removidos ou ja ausentes

| Item | Situacao |
|------|----------|
| `src/components/ui/coming-soon.tsx` | Ja ausente no disco no inicio do trabalho (sem consumidores). |
| `src/components/biblioteca/index.ts` | Idem — pasta usa imports diretos para `biblioteca-shell`, etc. |
| `src/lib/library/index.ts` | Idem — consumidores usam `@/lib/library/<modulo>`. |
| `src/lib/config/runtime.ts` | Ja ausente (substituido por `lib/client/runtime-defaults.ts` no fluxo atual). |
| SVGs template na raiz de `public/` | Ja ausentes; apenas `public/assets/` no repositorio local. |
| Exports mortos em `recommendation-engine-v2.ts` / `notify.ts` / `operational.ts` | Nada a remover: tipos internos ja nao exportados; `selectScenarioBinding` inexiste no codigo. |

---

## 2. Estrutura — antes vs depois (somente o que mudou neste sprint)

### Tipos e auth

- **Antes:** `AppRole` definido em `src/lib/auth/roles.ts` e reexportado por `current-user` / `api/auth`.
- **Depois:** definicao canonica em `src/lib/auth/types.ts`; `roles.ts` reexporta para compatibilidade com imports `@/lib/auth/roles`.

### Metric / workbench

- **Antes:** alias local `WorkbenchMetricAnswerType` em `load-workbench-payload.ts`.
- **Depois:** uso direto de `LibraryMetricAnswerType` (`@/lib/library/types`) com comentario de origem canonica.

### `ResponseMapping`

- **Sem mudanca de codigo:** continua canonicamente em `metric-response-mapper.ts` e reexportado por `binding-types.ts` (unificacao ja existente).

### Componentes e APIs (plano fase 4)

- **Ja alinhado antes deste sprint:** `src/components/respondente/*` e APIs `src/app/api/respondent/*` — nenhuma movimentacao adicional necessaria.

### Configuracao

- `tsconfig.json`: `target` **ES2017** → **ES2022**.
- `next.config.ts`: removido bloco `turbopack` (o script `dev` usa `next dev --webpack`).
- `package.json`: adicionada `devDependency` explicita `@vitest/coverage-v8@^4.1.4` (para `npm run test:coverage`).

### Seguranca / operacao

- `supabase/scripts/clean_database.sql`: cabecalho reforcado (aviso de script destrutivo + runbook).
- `supabase/scripts/clean-storage.mjs`: obrigatorio `CONFIRM=YES` no ambiente antes de esvaziar bucket.

### Documentacao

- `README.md`: secao **Convencoes de codigo** (PT/EN) + **Scripts destrutivos**.

---

## 3. Arquivos criticos alterados

| Arquivo | Motivo |
|---------|--------|
| `src/lib/auth/types.ts` | Novo — tipo `AppRole` centralizado. |
| `src/lib/auth/roles.ts` | Reexport apenas. |
| `src/lib/auth/current-user.ts`, `src/lib/api/auth.ts` | Import de `AppRole` a partir de `types.ts`. |
| `src/lib/workbench/load-workbench-payload.ts` | Tipagem alinhada a `LibraryMetricAnswerType`. |
| `src/components/biblioteca/biblioteca-shell.tsx` | Removidos efeitos que faziam `setState` apenas por derivacao; paginacao via handlers + `page` clamped. |
| `src/app/analista/recomendacoes/portfolio-view.tsx` | Selecao inicial derivada de URL + `useMemo`; override manual com `urlKey`; `loadPortfolio` agendado com `setTimeout(0)` para satisfazer `react-hooks/set-state-in-effect`. |
| `src/components/evidencias/evidences-shell.tsx` | Reset de `offset` nos `onChange` dos filtros; fetch agendado com `setTimeout(0)`. |
| `src/app/api/forms/transition/route.test.ts`, `src/app/api/fami/reprocess/route.test.ts` | Mock de `createSupabaseServerActionClient` para evitar `cookies()` fora do request scope do Next em Vitest. |
| `tsconfig.json`, `next.config.ts`, `package.json`, `package-lock.json` | Alinhamento de alvo ES, config Next, cobertura Vitest. |
| `supabase/scripts/clean_database.sql`, `clean-storage.mjs` | Hardening de scripts destrutivos. |
| `README.md` | Convencoes e documentacao de risco. |

---

## 4. Melhorias realizadas (resumo)

- Base de tipos de papel (`AppRole`) mais clara para manutencao e busca.
- Menos duplicacao conceitual entre workbench e biblioteca para tipo de resposta de metrica.
- Correcao pontual de padroes ESLint `react-hooks/set-state-in-effect` nos shells indicados no plano (biblioteca + portfolio + evidencias).
- Testes de rotas API que exercitam `requireAuth` sem contexto Next passam de forma estavel com mock do cliente servidor.
- Toolchain: ES2022, Next config enxuto, dependencia de cobertura explicita.
- Scripts Supabase perigosos exigem confirmacao consciente (JS) e aviso explicito (SQL).

---

## 5. Riscos remanescentes

- **`setTimeout(0)` em efeitos** (portfolio e evidencias): adia o fetch em um tick; comportamente quase identico ao anterior, com custo desprezivel de latencia; alternativa de medio prazo seria TanStack Query / SWR ou padrao de server actions.
- **Outros arquivos** ainda podem reportar o mesmo warning ESLint (`fami-maturity-shell`, `workbench-shell`, `recommendations-shell`, etc.) — fora do escopo estrito deste sprint; lista no plano como backlog.
- **`clean_database.sql`**: nao ha guard mecanico no Postgres; a responsabilidade continua sendo processo humano / pipeline.
- **Build Next**: avisos sobre lockfile/SWC e convencao `middleware` — monitorar upgrades do Next 16.

---

## 6. Proximas melhorias arquiteturais (backlog sugerido)

- Extrair data-fetching de listas grandes para uma camada de cache (React Query) e eliminar `setTimeout` de efeitos.
- Quebrar shells muito grandes (`workbench-shell`, `form-question-bindings-panel`, `lib/library/repository`) em modulos/testes menores.
- Consolidar `fetchJson` e headers de dev dos varios `client.ts` em `lib/client/api-client.ts`.
- Avaliacao futura de layout `src/features/<dominio>/` sem migracao big-bang.

---

## 7. Git / secrets

- `*.tsbuildinfo` e `.env*` estao no `.gitignore`; `tsconfig.tsbuildinfo` local nao deve ser versionado.
- Confirmar periodicamente com `git ls-files` que `.env.local` nao entrou no historico.
