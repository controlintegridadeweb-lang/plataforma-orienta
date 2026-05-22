import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // analyst aceito durante a transicao (Fase 2 da remocao do perfil).
  // Sera simplificado para ["admin"] na Fase 3.
  const user = await requireRole(["admin", "analyst"]);

  return (
    <AppShell
      user={user}
      title="Dashboard"
      description="Indicadores, evidências, complementações, pendências e maturidade (FAMI)"
    >
      {children}
    </AppShell>
  );
}
