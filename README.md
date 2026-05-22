# Plataforma Orienta

Monorepo com a aplicacao Next.js em **`orienta-v1/`**.

## Desenvolvimento

Na raiz deste repositorio existem atalhos npm que delegam para o pacote em `orienta-v1`:

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de producao
- `npm run start` — servidor apos build
- `npm run lint` — ESLint
- `npm run test` / `npm run test:coverage` — Vitest

Variaveis de ambiente e detalhes do app: veja **[orienta-v1/README.md](orienta-v1/README.md)**.

## CI

O workflow GitHub Actions fica em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) e executa `npm ci`, lint, testes e build com diretorio de trabalho `orienta-v1`.

## Deploy na Vercel

Guia completo: **[orienta-v1/docs/DEPLOY-VERCEL.md](orienta-v1/docs/DEPLOY-VERCEL.md)** (GitHub, builds automaticos, env, Supabase, dominio `*.vercel.app`, branch `staging`).
