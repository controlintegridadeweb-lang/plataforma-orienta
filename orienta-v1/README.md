# Plataforma Orienta V1

Aplicacao de diagnostico operacional com Next.js e Supabase, contendo:

- workflow de respostas e validacao de evidencias;
- calculo e reprocessamento FAMI;
- inferencia e gestao de recomendacoes;
- plano de acao e portfolio;
- geracao de relatorio PDF.

## Stack

- Next.js (App Router), React, TypeScript e Tailwind.
- Supabase (PostgreSQL, Auth, Storage).
- `sonner` para o sistema de toasts.
- Vitest para testes de regras de dominio.

## Convencoes de codigo

- **Rotas e copy de UI**: nomes em portugues (`/admin`, `/analista`, `/respondente`, pastas `formularios`, `evidencias`, etc.).
- **Camadas tecnicas**: pastas e modulos em ingles (`lib/forms`, `lib/library`, `lib/workbench`, APIs em `src/app/api/admin`, `.../respondent`, etc.).
- **Supabase no app**: use as factories existentes (`createSupabaseServerActionClient`, `createSupabaseServiceRoleClient`, helpers em `src/lib/supabase/`) em vez de instanciar clientes ad hoc.
- **FAMI / reprocessamento**: fluxo e impacto operacional estao descritos em `AGENTS.md` e no codigo de `src/lib/domain/operational.ts` e servicos FAMI.

### Scripts destrutivos (Supabase)

- `supabase/scripts/clean_database.sql` — apaga dados em `public` e `auth.users` e recarrega orgs; **irreversivel**; use so com backup.
- `supabase/scripts/clean-storage.mjs` — esvazia o bucket `evidencias`; exige `CONFIRM=YES` no ambiente alem de `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`.

## Sistema de feedback (toasts + loading)

- Toasts: use `notify.*` de `@/lib/notify` (`success`, `error`, `warning`,
  `info`, `loading`, `promise`, `dismiss`). O `<Toaster>` global ja esta
  montado em `app/layout.tsx`.
- Loading: use os primitivos de `@/components/ui/loading`
  (`<Spinner>`, `<LoadingButton>`, `<Skeleton>`, `<SkeletonText>`,
  `<TableSkeleton>`, `<PageLoader>`, `<InlineLoader>`).
- Cada segmento (`/admin`, `/analista`, `/respondente`, `/auth`) tem
  `loading.tsx` proprio com Suspense fallback.
- A barra de progresso de rota (`<RouteProgressBar>`) esta ativa
  globalmente — anima durante navegacao entre rotas.
- Convencoes detalhadas em `AGENTS.md` (secao "Feedback de sistema").

## Requisitos

- Node.js 20+.
- Banco Supabase com schema aplicado via `supabase/migrations/0001_orienta_v1.sql`.

## Configuracao local

1. Instalar dependencias:

```bash
npm install
```

2. Copiar variaveis:

```bash
cp .env.example .env.local
```

3. Preencher `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID=
NEXT_PUBLIC_DEFAULT_FORM_ID=
NEXT_PUBLIC_DEFAULT_RESPONDENT_USER_ID=
NEXT_PUBLIC_DEFAULT_ANALYST_USER_ID=
NEXT_PUBLIC_DEFAULT_ADMIN_USER_ID=
```

`NEXT_PUBLIC_APP_URL` deve ser a mesma URL (host + porta) em que o app roda localmente; o `npm run dev` fixa a porta em **3000**.

As variaveis `NEXT_PUBLIC_DEFAULT_*` sao usadas apenas para preencher campos de homologacao nas telas.

## Execucao

```bash
npm run dev
```

Rotas de interface:

- `/`
- `/respondente`
- `/analista`
- `/plano-acao`
- `/portfolio-recomendacoes`

## Seguranca e autorizacao

- Endpoints em `src/app/api/dev/*` aceitam requisicoes somente em `NODE_ENV=development`.
- Endpoints exigem autenticacao/autorizacao por perfil (`admin`, `analyst`, `respondent`).
- Em ambiente de desenvolvimento, os exemplos de tela enviam `x-user-id` e `x-user-role` para simular contexto autenticado.
- Operacoes administrativas no Supabase usam client de service role em rotas restritas.

## Seed de homologacao

Com o app local em execucao:

```bash
curl -X POST http://localhost:3000/api/dev/seed-homolog \
  -H "Content-Type: application/json" \
  -H "x-user-id: <admin-user-id>" \
  -H "x-user-role: admin" \
  -d "{\"adminUserId\":\"<admin-user-id>\",\"analystUserId\":\"<analyst-user-id>\",\"respondentUserId\":\"<respondent-user-id>\"}"
```

## Qualidade

```bash
npm run lint
npm run test
npm run build
```

CI em GitHub Actions foi adicionada em `.github/workflows/ci.yml` para executar os mesmos gates.

## Deploy (Vercel + GitHub + Supabase)

Para publicar com URL publica, branch `staging` e variaveis na Vercel, siga o guia **[docs/DEPLOY-VERCEL.md](docs/DEPLOY-VERCEL.md)**.

Resumo: importe o repositorio na Vercel com **Root Directory** = `orienta-v1`, configure as env de [`.env.vercel.example`](.env.vercel.example) e as Redirect URLs no Supabase Auth.
