<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Feedback de sistema

A plataforma usa um sistema unificado para feedback ao usuario. Antes de
adicionar componentes novos, prefira sempre os primitivos abaixo.

### Toasts (feedback transitorio)

Use `notify` de `@/lib/notify` para qualquer feedback transitorio de acao
(salvou, removeu, falhou ao publicar, gerou PDF). NAO crie novos banners
inline com `useState<{type, message}>`.

```ts
import { notify, describeError } from "@/lib/notify";

await notify.promise(saveSomething(), {
  loading: "Salvando…",
  success: "Salvo com sucesso.",
  error: (err) => describeError(err, "Falha ao salvar."),
});

try {
  await action();
  notify.success("Feito.");
} catch (e) {
  notify.error(describeError(e, "Falha."));
}
```

API disponivel: `notify.success`, `.error`, `.warning`, `.info`, `.loading`,
`.promise`, `.dismiss`. O `<Toaster>` ja esta montado em `app/layout.tsx`;
nao remonte localmente.

### Quando NAO usar toast

- **Erros de validacao de campo** (ex.: senha curta, e-mail invalido)
  ficam inline no proprio formulario, perto do campo.
- **Estado persistente da pagina** (ex.: "Selecione organizacao para
  carregar") fica como texto contextual no body da view.

### Loading states

Use os primitivos de `@/components/ui/loading`:

- `<Spinner size="xs|sm|md|lg|xl" />` em vez de `<Loader2 className="animate-spin">`.
- `<LoadingButton pending pendingLabel="Salvando…">Salvar</LoadingButton>` em
  vez do padrao `<button disabled aria-busy>{pending ? <Loader2/> : "Salvar"}</button>`.
- `<Skeleton className="h-4 w-32" />` e `<SkeletonText lines>` para placeholders.
- `<TableSkeleton rows cols />` para listas tabulares.
- `<PageLoader title description />` em `loading.tsx` de cada segmento (Next.js Suspense).
- `<InlineLoader label />` para blocos especificos carregando dentro de um painel.

### Barra de progresso de rota

Esta automaticamente ativa no layout raiz via `<RouteProgressBar />`.
Nao adicione barras concorrentes.
