"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type RecommendationDetailTabDef = {
  href: string;
  label: string;
};

function tabClass(active: boolean): string {
  return active
    ? "rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm ring-1 ring-brand-700/20"
    : "rounded-lg px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900";
}

export function RecommendationDetailTabs({
  tabs,
  "aria-label": ariaLabel,
}: {
  tabs: RecommendationDetailTabDef[];
  "aria-label": string;
}) {
  const pathname = usePathname() ?? "";
  return (
    <nav
      className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const active =
          pathname === tab.href ||
          (tab.href.length > 1 && pathname.startsWith(`${tab.href}/`));
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`shrink-0 ${tabClass(active)}`}
            aria-current={active ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
