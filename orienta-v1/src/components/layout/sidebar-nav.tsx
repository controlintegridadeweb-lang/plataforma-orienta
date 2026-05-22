"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { sidebar } from "@/lib/design-system";
import { useSidebar } from "./sidebar-shell";

/**
 * Roots de cada perfil (Dashboard) que devem casar SOMENTE com a rota exata.
 * Sem esta lista, "/admin" fica ativo em todas as sub-rotas (ex.: /admin/biblioteca),
 * e dois itens do menu pintam como ativos ao mesmo tempo.
 */
const EXACT_MATCH_ROOTS = new Set(["/", "/admin", "/analista", "/respondente"]);

function isActive(pathname: string, href: string): boolean {
  if (EXACT_MATCH_ROOTS.has(href)) return pathname === href;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}

export function SidebarNavLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const active = isActive(pathname, href);
  const { closeDrawer } = useSidebar();

  return (
    <Link
      href={href}
      title={label}
      aria-current={active ? "page" : undefined}
      onClick={closeDrawer}
      // Item ativo: fundo escuro + ring sutil. Item inativo: hover suave.
      // Sem border-l-4: o "tab" lateral ficava feio quando o menu colapsa para
      // so icones; o ring/bg ja diferenciam ativo de forma legivel nos 2 modos.
      className={active ? sidebar.linkActive : sidebar.link}
    >
      {children}
      <span className="sb-label truncate">{label}</span>
    </Link>
  );
}
