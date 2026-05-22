"use client";

import { useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import {
  groupByOrganization,
  type AdminRecommendationItem,
  type OrganizationSummary,
} from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationCard } from "./admin-recommendation-card";

type Props = {
  items: AdminRecommendationItem[];
  initiallyExpanded?: number;
};

type OrgStatDef = {
  label: string;
  value: number;
  accentClass: string;
};

function OrgExecutiveStat({ label, value, accentClass }: OrgStatDef) {
  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 shadow-[var(--shadow-card)]"
      title={label}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-l-lg ${accentClass}`}
      />
      <p className="pl-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 pl-1.5 text-xl font-semibold tabular-nums leading-none text-slate-900">
        {value}
      </p>
    </div>
  );
}

function orgStats(group: OrganizationSummary): OrgStatDef[] {
  return [
    {
      label: "Total",
      value: group.total,
      accentClass: "bg-slate-400/50",
    },
    {
      label: "Em execução",
      value: group.inExecution,
      accentClass: "bg-[color-mix(in_srgb,var(--color-brand-500)_38%,transparent)]",
    },
    {
      label: "Sem plano",
      value: group.withoutPlan,
      accentClass:
        group.withoutPlan > 0
          ? "bg-amber-500/45"
          : "bg-slate-300/50",
    },
    {
      label: "Atrasadas",
      value: group.overdue,
      accentClass:
        group.overdue > 0 ? "bg-rose-500/45" : "bg-slate-300/50",
    },
    {
      label: "Concluídas",
      value: group.completed,
      accentClass: "bg-emerald-500/40",
    },
  ];
}

export function AdminRecommendationOrganizationView({
  items,
  initiallyExpanded = 0,
}: Props) {
  const groups = groupByOrganization(items);
  const [expanded, setExpanded] = useState<Set<string>>(
    new Set(groups.slice(0, initiallyExpanded).map((g) => g.organizationId)),
  );

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (groups.length === 0) return null;

  return (
    <div className="space-y-2.5">
      {groups.map((group) => {
        const isOpen = expanded.has(group.organizationId);
        const rows = items.filter((i) => i.organizationId === group.organizationId);
        const stats = orgStats(group);

        return (
          <section
            key={group.organizationId}
            className="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-[var(--shadow-card)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-100/90 px-3.5 py-2.5 sm:px-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50 text-slate-600">
                  <Building2 className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold text-slate-900"
                    title={group.organizationName}
                  >
                    {group.organizationName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {group.total}{" "}
                    {group.total === 1 ? "recomendação" : "recomendações"} ·{" "}
                    {group.executionPct}% concluídas
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => toggle(group.organizationId)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Recolher recomendações" : "Expandir recomendações"}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:border-slate-200/80 hover:bg-slate-50 hover:text-slate-700"
              >
                <span className="hidden sm:inline">{isOpen ? "Recolher" : "Expandir"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 lg:grid-cols-5 sm:p-3.5">
              {stats.map((stat) => (
                <OrgExecutiveStat key={stat.label} {...stat} />
              ))}
            </div>

            {isOpen ? (
              <div className="border-t border-slate-100 bg-slate-50/40 p-3 sm:p-4">
                <ul className="grid gap-2.5 lg:grid-cols-2">
                  {rows.map((it) => (
                    <li key={it.recommendationId}>
                      <AdminRecommendationCard item={it} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
