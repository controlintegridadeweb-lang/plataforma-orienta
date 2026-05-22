"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WORKSPACE_TABS, workspaceTabFromPathname } from "./workspace-tab-meta";

export type RecommendationDetailTabDef = {
  href: string;
  label: string;
  tagline?: string;
};

function tabClass(active: boolean): string {
  return active
    ? "rounded-xl bg-brand-600 px-4 py-3 text-white shadow-sm ring-1 ring-brand-700/20 sm:min-w-[8.5rem]"
    : "rounded-xl px-4 py-3 text-slate-600 ring-1 ring-transparent transition hover:bg-slate-50 hover:text-slate-900 sm:min-w-[8.5rem]";
}

export function RecommendationDetailTabs({
  tabs,
  "aria-label": ariaLabel,
}: {
  tabs: RecommendationDetailTabDef[];
  "aria-label": string;
}) {
  const pathname = usePathname() ?? "";
  const activeKey = workspaceTabFromPathname(pathname);

  return (
    <nav
      className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
      aria-label={ariaLabel}
    >
      <ol className="grid gap-2 sm:grid-cols-3">
        {tabs.map((tab) => {
          const active =
            pathname === tab.href ||
            (tab.href.length > 1 && pathname.startsWith(`${tab.href}/`));
          const meta = WORKSPACE_TABS.find((t) => t.label === tab.label);
          const tagline = tab.tagline ?? meta?.tagline;

          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col ${tabClass(active)}`}
                aria-current={active ? "page" : undefined}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {tagline ?? "—"}
                </span>
                <span className={`mt-0.5 text-sm font-semibold ${active ? "" : "text-slate-800"}`}>
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
      <p className="sr-only">Aba ativa: {WORKSPACE_TABS.find((t) => t.key === activeKey)?.label}</p>
    </nav>
  );
}
