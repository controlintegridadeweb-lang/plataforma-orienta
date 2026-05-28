import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function RespondenteLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["respondent"]);
  return (
    <AppShell
      user={user}
      title="Area do respondente"
      description="Formulários, evidências, recomendações e plano, pontuação FAMI, relatórios e perfil"
    >
      {children}
    </AppShell>
  );
}
