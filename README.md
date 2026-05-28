# Plataforma Orienta

Monorepo com a aplicacao Next.js em **`orienta-v1/`**. Abra **esta pasta** como raiz no Cursor/VS Code (ex.: `Downloads\PLATAFORMA ORIENTA FINAL\PLATAFORMA ORIENTA` — use a pasta interna `PLATAFORMA ORIENTA`, nao a pasta `... FINAL` sozinha). Detalhes: [docs/MONOREPO_LAYOUT.md](docs/MONOREPO_LAYOUT.md).

## Estrutura do repositorio

```
PLATAFORMA ORIENTA/          ← raiz do git (abra esta pasta)
├── .github/workflows/       ← CI (working-directory: orienta-v1)
├── docs/                    ← layout do monorepo (MONOREPO_LAYOUT.md)
├── scripts/                 ← utilitarios do repo (limpeza de copias)
├── package.json             ← atalhos npm (dev, build, test na raiz)
├── orienta-v1/              ← app Next.js + Supabase (codigo principal)
│   ├── src/
│   ├── docs/                ← arquitetura, fases, deploy (ver docs/README.md)
│   ├── supabase/migrations/
│   └── package.json
├── Plataforma-Orienta.code-workspace
└── README.md
```

**Evite** recriar `PLATAFORMA ORIENTA\PLATAFORMA ORIENTA\` — era uma copia duplicada. Se aparecer `_lixo-pasta-duplicada/`, remova com o script abaixo.

## Desenvolvimento

Na **raiz** (recomendado):

```powershell
cd "C:\Users\01647043450\Downloads\PLATAFORMA ORIENTA FINAL\PLATAFORMA ORIENTA"
npm run install:app
npm run dev
```

Ou direto na app:

```powershell
cd orienta-v1
npm install
cp .env.example .env.local
npm run dev
```

Documentacao, variaveis, testes e deploy: **[orienta-v1/README.md](orienta-v1/README.md)**.

## Limpar copia duplicada

Se ainda existir `_lixo-pasta-duplicada/` ou `PLATAFORMA ORIENTA\PLATAFORMA ORIENTA\`:

1. Pare `npm run dev` e feche arquivos abertos dessa copia.
2. Execute:

```powershell
powershell -File scripts/remove-nested-folder.ps1
```

Se falhar por “acesso negado” a um `.node`, feche o Cursor e rode o script de novo.

## Cursor / VS Code

- Workspace: **[Plataforma-Orienta.code-workspace](Plataforma-Orienta.code-workspace)** (aponta para `orienta-v1`).
- Ou abra a pasta `orienta-v1` diretamente.

## CI e deploy

- CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) — `working-directory: orienta-v1`
- Vercel: **Root Directory** = `orienta-v1` — [orienta-v1/docs/operations/DEPLOY-VERCEL.md](orienta-v1/docs/operations/DEPLOY-VERCEL.md)
