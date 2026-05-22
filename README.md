# Plataforma Orienta

Repositorio com a aplicacao Next.js em **[orienta-v1/](orienta-v1/)**.

## Desenvolvimento

```bash
cd orienta-v1
npm install
cp .env.example .env.local
npm run dev
```

Documentacao, variaveis de ambiente, testes e deploy: **[orienta-v1/README.md](orienta-v1/README.md)**.

## Cursor / VS Code

Abra a pasta `orienta-v1` como workspace, ou use o arquivo **[Plataforma-Orienta.code-workspace](Plataforma-Orienta.code-workspace)** na raiz deste repositorio.

## CI

Workflow em [`.github/workflows/ci.yml`](.github/workflows/ci.yml) (working directory: `orienta-v1`).

## Deploy (Vercel)

Configure **Root Directory** = `orienta-v1` no projeto Vercel. Guia: **[orienta-v1/docs/DEPLOY-VERCEL.md](orienta-v1/docs/DEPLOY-VERCEL.md)**.
