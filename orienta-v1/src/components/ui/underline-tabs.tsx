"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type UnderlineTabItem = {
  href: string;
  label: string;
};

export function underlineTabLinkClass(active: boolean, embedded = false): string {
  const base =
    "relative whitespace-nowrap border-b-2 px-4 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/25 ";

  if (embedded) {
    return (
      base +
      "py-3.5 sm:px-5 " +
      (active
        ? "-mb-px border-brand bg-white text-brand-700"
        : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900")
    );
  }

  return (
    base +
    "py-2.5 " +
    (active
      ? "border-brand bg-white text-brand-700 shadow-[inset_0_1px_0_0_rgb(255_255_255)]"
      : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900")
  );
}

export function UnderlineTabs({
  tabs,
  embedded = false,
  "aria-label": ariaLabel,
}: {
  tabs: UnderlineTabItem[];
  /** Abas dentro de um painel (continuidade com o conteúdo abaixo). */
  embedded?: boolean;
  /** Navegação principal entre rotas secundárias. */
  "aria-label": string;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className={
        embedded
          ? "flex flex-wrap gap-x-0.5 overflow-x-auto border-b border-slate-200/80 bg-white px-3 sm:px-5"
          : "flex flex-wrap gap-0 border-b border-slate-200/90 bg-slate-50/40"
      }
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={underlineTabLinkClass(active, embedded)}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
