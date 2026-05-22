# Configuracao na Vercel

O app Next.js esta em **`orienta-v1/`**. O repositorio ja envia `vercel.json` na raiz com:

- `installCommand`: `npm ci --prefix orienta-v1`
- `buildCommand`: `npm run build --prefix orienta-v1`

## Opcao A (melhor) — Root Directory

**Settings → General → Root Directory** = `orienta-v1` → Save.

**Build and Deployment**: deixe Install / Build / Output **vazios**.

## Opcao B — Raiz do repo (se nao mudar Root Directory)

**Build and Deployment** deve usar o `vercel.json` do GitHub (nao sobrescreva com outro comando).

Se ainda aparecer `up to date in 456ms` no install e `next: command not found`, apague comandos customizados e faca **Redeploy** apos o ultimo push no `main`.

## Redeploy

**Deployments** → **Redeploy**.

Log esperado: `added 400+ packages` no install e `next build` concluindo sem erro.
