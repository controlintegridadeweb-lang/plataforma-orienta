# FRONTEND ARCHITECTURE

## Arquitetura Front-end

Stack:

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS
- Componentes de UI em `src/components/ui`

## Estrutura real do codigo (`src/`)

```
src/
├── app/                    # Rotas App Router (URLs em portugues)
│   ├── admin/              # Portal staff
│   ├── respondente/        # Portal respondente
│   ├── auth/
│   └── api/                # Route handlers (REST em ingles)
├── components/             # UI por feature / papel (+ shared hubs)
├── lib/                    # Dominio, servicos, Supabase, layout tokens
│   ├── domain/             # Regras puras (testaveis)
│   ├── layout/             # design-system, formSurface, page layouts
│   ├── config/             # navegacao, headings, URLs, assets de hero
│   ├── hooks/              # Hooks reutilizaveis entre features
│   └── <modulo>/           # forms, evidences, fami, library, …
└── proxy.ts
```

Convencoes de nomenclatura:

- **Rotas e copy de UI:** portugues (`/admin/formularios`, `evidencias`).
- **Pastas tecnicas em `lib/` e `api/`:** ingles (`forms`, `evidences`, `recommendations`).

## Camadas e responsabilidades

| Camada | Onde | Responsabilidade |
|--------|------|------------------|
| Pagina | `src/app/**/page.tsx` | Roteamento, composicao, data fetching fino |
| UI | `src/components/**` | Apresentacao, estado local de tela |
| Servico | `src/lib/<modulo>/` | Orquestracao, validacao, chamadas Supabase |
| Dominio | `src/lib/domain/` | Regras operacionais puras |
| Layout / tokens | `src/lib/layout/` | `design-system`, `formSurface`, bleed de hero |
| Config | `src/lib/config/` | Nav, headings, `app-url`, imagens de hero |

Pipeline recomendado por modulo (ex.: `lib/library/README.md`):

```
UI (components)
  → client.ts (fetch)
  → app/api/.../route.ts
  → service.ts
  → repository.ts (supabase)
```

## Feedback e loading

- Toasts: `notify` de `@/lib/notify` (ver `AGENTS.md`).
- Loading: primitivos em `@/components/ui/loading`.
- Barra de rota: `<RouteProgressBar />` no layout raiz (nao duplicar).

## Regras de componentizacao

Separacao obrigatoria:

UI != Estado != Servico != Regra operacional

Proibido:

- componentes gigantes;
- Supabase espalhado na UI;
- logica duplicada;
- props drilling extremo;
- status inventados fora de `lib/domain`.

## Onde colocar codigo novo

1. Regra de negocio → `lib/domain/` ou `lib/<modulo>/service.ts`.
2. Componente usado por admin e respondente → `components/recommendations-hub` ou pasta `shared` equivalente.
3. Componente exclusivo de um papel → `components/admin-*` ou `components/respondente-*`.
4. Token de superficie / tipografia → `lib/layout/`.
5. URL de asset de hero ou constante de app → `lib/config/` ou `lib/config/page-assets/`.
