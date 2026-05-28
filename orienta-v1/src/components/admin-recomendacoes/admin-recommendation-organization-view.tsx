"use client";

import { useMemo, useState } from "react";
import { Building2, ChevronDown } from "lucide-react";
import { AdminRecommendationTable } from "@/components/admin-recomendacoes/admin-recommendation-table";
import {
  groupByOrganization,
  type AdminRecommendationItem,
  type OrganizationSummary,
} from "@/lib/recommendations/admin-presentation";
import { typography } from "@/lib/design-system";

type Props = {
  items: AdminRecommendationItem[];
  initiallyExpanded?: number;
};

type OrgStatDef = {
  label: string;
  value: string;
  accentClass: string;
};

function OrgExecutiveStat({ label, value, accentClass }: OrgStatDef) {
  return (
    <div
      className="relative min-w-0 overflow-hidden rounded-lg border border-slate-200/90 bg-white px-2.5 py-2 shadow-card"
      title={label}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-y-0 left-0 w-0.5 rounded-l-lg ${accentClass}`}
      />
      <p className="pl-1.5 text-2xs font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 pl-1.5 text-lg font-semibold tabular-nums leading-none text-slate-900">
        {value}
      </p>
    </div>
  );
}

function orgStats(group: OrganizationSummary, avgProgress: number): OrgStatDef[] {
  return [
    {
      label: "Recomendações",
      value: String(group.total),
      accentClass: "bg-slate-400/50",
    },
    {
      label: "Progresso médio",
      value: `${avgProgress}%`,
      accentClass: "bg-[color-mix(in_srgb,var(--color-brand-500)_38%,transparent)]",
    },
    {
      label: "Em execução",
      value: String(group.inExecution),
      accentClass: "bg-sky-500/40",
    },
    {
      label: "Sem plano",
      value: String(group.withoutPlan),
      accentClass: group.withoutPlan > 0 ? "bg-amber-500/45" : "bg-slate-300/50",
    },
    {
      label: "Atrasadas",
      value: String(group.overdue),
      accentClass: group.overdue > 0 ? "bg-rose-500/45" : "bg-slate-300/50",
    },
    {
      label: "Concluídas",
      value: `${group.executionPct}%`,
      accentClass: "bg-emerald-500/40",
    },
  ];
}

function averageProgress(rows: AdminRecommendationItem[]): number {
  if (rows.length === 0) return 0;
  return Math.round(rows.reduce((sum, row) => sum + row.progress, 0) / rows.length);
}

export function AdminRecommendationOrganizationView({
  items,
  initiallyExpanded = 1,
}: Props) {
  const groups = groupByOrganization(items);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(groups.slice(0, initiallyExpanded).map((g) => g.organizationId)),
  );

  const rowsByOrg = useMemo(() => {
    const map = new Map<string, AdminRecommendationItem[]>();
    for (const item of items) {
      const arr = map.get(item.organizationId) ?? [];
      arr.push(item);
      map.set(item.organizationId, arr);
    }
    return map;
  }, [items]);

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
    <div className="space-y-2" role="list" aria-label="Recomendações por organização">
      {groups.map((group) => {
        const isOpen = expanded.has(group.organizationId);
        const rows = rowsByOrg.get(group.organizationId) ?? [];
        const avgProgress = averageProgress(rows);
        const stats = orgStats(group, avgProgress);

        return (
          <section
            key={group.organizationId}
            role="listitem"
            className="overflow-hidden rounded-xl border border-slate-200/95 bg-white shadow-card"
          >
            <button
              type="button"
              onClick={() => toggle(group.organizationId)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-3 border-b border-slate-100/90 px-3.5 py-3 text-left transition hover:bg-slate-50/60 sm:px-4"
            >
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
                  <p className={typography.meta}>
                    {group.total}{" "}
                    {group.total === 1 ? "recomendação" : "recomendações"} · progresso médio{" "}
                    <span className="font-semibold tabular-nums text-slate-800">{avgProgress}%</span>
                    {" · "}
                    {group.overdue > 0 ? (
                      <span className="font-medium text-rose-700">{group.overdue} atrasada(s)</span>
                    ) : (
                      <span>{group.executionPct}% concluídas</span>
                    )}
                  </p>
                </div>
              </div>

              <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-slate-500">
                <span className="hidden sm:inline">{isOpen ? "Recolher" : "Expandir"}</span>
                <ChevronDown
                  className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
            </button>

            <div className="grid grid-cols-2 gap-2 border-b border-slate-100/80 bg-slate-50/30 p-3 sm:grid-cols-3 lg:grid-cols-6 sm:p-3.5">
              {stats.map((stat) => (
                <OrgExecutiveStat key={stat.label} {...stat} />
              ))}
            </div>

            {isOpen ? (
              <div className="p-2 sm:p-3">
                <AdminRecommendationTable
                  items={rows}
                  hideOrganizationColumn
                />
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
