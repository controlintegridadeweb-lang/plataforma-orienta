import { redirect } from "next/navigation";

/** Redireciona sandboxes de desenvolvimento para a rota integrada em produção. */
export function assertDevPageOrRedirect(productionPath: string): void {
  if (process.env.NODE_ENV !== "development") {
    redirect(productionPath);
  }
}
