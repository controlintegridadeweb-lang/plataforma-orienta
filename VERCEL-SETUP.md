# Configuracao obrigatoria na Vercel

O app Next.js esta em **`orienta-v1/`**, nao na raiz do repositorio.

## Settings → General

| Campo | Valor |
|-------|--------|
| **Root Directory** | `orienta-v1` |

Clique **Save** se pedir confirmacao.

## Settings → Build and Deployment

Deixe **vazio** (padrao) estes campos:

- Build Command  
- Install Command  
- Output Directory  

Se houver valor customizado (ex. `npm --prefix orienta-v1 ...`), **apague** e salve.

O arquivo `orienta-v1/vercel.json` cuida do resto.

## Redeploy

**Deployments** → **Redeploy** no ultimo deploy.

No log deve aparecer instalacao **dentro** de `orienta-v1` (centenas de pacotes) e depois `next build` **sem** erro.
