"use client";

import { usePathname } from "next/navigation";
import { workspaceTabMeta } from "./workspace-tab-meta";

export function WorkspaceTabIntro() {
  const pathname = usePathname() ?? "";
  const meta = workspaceTabMeta(pathname);

  return (
    <div
      className="flex flex-col gap-1 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5"
      role="status"
      aria-label={`Aba ${meta.label}: ${meta.tagline}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-700">
          {meta.tagline}
        </p>
        <p className="text-sm text-slate-600">{meta.description}</p>
      </div>
      <span className="shrink-0 self-start rounded-md bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200/90 sm:self-center">
        {meta.label}
      </span>
    </div>
  );
}
