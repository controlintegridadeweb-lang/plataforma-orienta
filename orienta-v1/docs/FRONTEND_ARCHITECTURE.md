# FRONTEND ARCHITECTURE

## Arquitetura Front-end

Stack:

- Next.js 16
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui

Estrutura:

`src/`
`app/`
`modules/`
`components/`
`hooks/`
`services/`
`lib/`
`types/`
`assets/`
`styles/`
`config/`

## Regras de Componentizacao

Separacao obrigatoria:

UI
!=
Estado
!=
Servico
!=
Regra operacional

Proibido:

- componentes gigantes;
- Supabase espalhado;
- logica duplicada;
- props drilling extremo.
