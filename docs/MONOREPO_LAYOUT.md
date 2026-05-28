# Layout do monorepo

## Onde abrir no Cursor / VS Code

| Pasta | Papel |
|-------|--------|
| **`PLATAFORMA ORIENTA/`** | Raiz do **git** — abra esta pasta (ex.: `Downloads\PLATAFORMA ORIENTA`) |
| `orienta-v1/` | App Next.js + Supabase (codigo e `package.json` da aplicacao) |

## Arvore oficial

```
PLATAFORMA ORIENTA/              ← git root
├── .github/workflows/           ← CI (working-directory: orienta-v1)
├── docs/                        ← documentacao do monorepo
├── scripts/                     ← utilitarios do repo (limpeza de copias)
├── package.json                 ← atalhos npm (dev, test, lint na raiz)
├── orienta-v1/                  ← aplicacao
│   ├── src/
│   ├── docs/                    ← documentacao da app (arquitetura, fases, deploy)
│   ├── supabase/
│   └── package.json
├── Plataforma-Orienta.code-workspace
└── README.md
```

## Deploy e CI (nao alterar sem atualizar Vercel)

- **GitHub Actions:** `working-directory: orienta-v1`
- **Vercel Root Directory:** `orienta-v1`

## Copias duplicadas

Nao mantenha `PLATAFORMA ORIENTA\PLATAFORMA ORIENTA\` nem `_lixo-pasta-duplicada/`. Para remover:

```powershell
cd "C:\caminho\para\PLATAFORMA ORIENTA"
powershell -ExecutionPolicy Bypass -File scripts\remove-nested-folder.ps1
```
