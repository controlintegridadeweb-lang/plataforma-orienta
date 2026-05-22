import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AnalistaLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["analyst"]);
  return (
    <AppShell
      user={user}
      title="Dashboard do Analista"
      description="Acompanhamento de validações, recomendações e maturidade FAMI"
    >
      {children}
    </AppShell>
  );
}
