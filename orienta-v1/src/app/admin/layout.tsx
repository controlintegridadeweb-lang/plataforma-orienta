import type { ReactNode } from "react";
import { requireRole } from "@/lib/auth/current-user";
import { AppShell } from "@/components/layout/app-shell";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireRole(["admin"]);

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
