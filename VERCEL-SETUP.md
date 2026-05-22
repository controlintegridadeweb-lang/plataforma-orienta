# Configuracao na Vercel

O app Next.js esta em **`orienta-v1/`**. O `package.json` na raiz tem `postinstall` que roda `npm ci` em `orienta-v1` em todo `npm install` da Vercel.

**Importante:** no deploy, o commit deve ser recente (nao `a6a1e2b`). Use o ultimo da branch `main`.

## Opcao A (melhor) — Root Directory

**Settings → General → Root Directory** = `orienta-v1` → Save.

**Build and Deployment**: deixe Install / Build / Output **vazios**.

## Opcao B — Raiz do repo (se nao mudar Root Directory)

**Build and Deployment** deve usar o `vercel.json` do GitHub (nao sobrescreva com outro comando).

Se ainda aparecer `up to date in 456ms` no install e `next: command not found`, apague comandos customizados e faca **Redeploy** apos o ultimo push no `main`.

## Redeploy

**Deployments** → **Redeploy**.

Log esperado: `added 400+ packages` no install e `next build` concluindo sem erro.
