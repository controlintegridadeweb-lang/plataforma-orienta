"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, Shield } from "lucide-react";
import { LEVEL_META, rankAxesByImpact } from "@/lib/fami/respondent-presentation";
import type { AxisMaturity } from "@/lib/fami/types";
import { formSurface } from "@/lib/form-surface";

type AxisStats = {
  recommendationsOpen: number;
  recommendationsTotal: number;
  evidencesPending: number;
};

type Props = {
  axes: AxisMaturity[];
  /** Mapa axisName -> stats (recomendações + evidências). */
  statsByAxisName: Map<string, AxisStats>;
  /** Filtro vindo dos summary cards. */
  filter?: "critical" | "advanced" | null;
};

function progressColor(percentage: number): string {
  if (percentage >= 75) return "bg-emerald-500";
  if (percentage >= 50) return "bg-sky-500";
  if (percentage >= 25) return "bg-amber-500";
  return "bg-rose-500";
}

export function RespondentFamiAxisOverview({
  axes,
  statsByAxisName,
  filter,
}: Props) {
  const ranked = rankAxesByImpact(axes);
  const rows = ranked.filter((row) => {
    if (filter === "critical") return row.isCritical;
    if (filter === "advanced") return row.isAdvanced;
    return true;
  });

  if (rows.length === 0) {
    return (
      <div className={formSurface.empty.container}>
        <p className={formSurface.empty.description}>Nenhum eixo no recorte atual.</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2" aria-label="Visão por eixo">
      {rows.map((row) => {
        const meta = LEVEL_META[row.level];
        const stats = statsByAxisName.get(row.axisName);
        return (
          <li
            key={row.axisId ?? row.axisName}
            className={`${formSurface.card} transition hover:-translate-y-0.5 hover:shadow-card-hover`}
          >
            <div className="border-b border-slate-100/80 px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="line-clamp-1 text-sm font-semibold text-slate-900" title={row.axisName}>
                    {row.axisName}
                  </p>
                  <p className="text-micro text-slate-500">{meta.range}</p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-semibold ${meta.badgeClasses}`}
                  title={meta.description}
                >
                  N{meta.level} · {meta.shortLabel}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className={`text-2xl font-bold tabular-nums ${meta.textColor}`}>
                  {row.percentage.toFixed(1)}%
                </span>
                {row.isCritical ? (
                  <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-2xs font-semibold text-rose-700">
                    Crítico
                  </span>
                ) : row.isAdvanced ? (
                  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-2xs font-semibold text-emerald-700">
                    Avançado
                  </span>
                ) : null}
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-1.5 rounded-full transition-all ${progressColor(row.percentage)}`}
                  style={{ width: `${row.percentage}%` }}
                />
              </div>
              <p className="mt-2 text-micro text-slate-500">
                Impacto potencial:{" "}
                <strong className="font-semibold text-slate-700">
                  +{row.impact.toFixed(1)} p.p.
                </strong>{" "}
                no global se atingir 100%.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/40 px-4 py-2.5 text-micro text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1">
                  <ClipboardList className="h-3 w-3 text-slate-400" aria-hidden />
                  {stats?.recommendationsOpen ?? 0} de {stats?.recommendationsTotal ?? 0}{" "}
                  recomendações abertas
                </span>
                <span className="inline-flex items-center gap-1">
                  <Shield className="h-3 w-3 text-slate-400" aria-hidden />
                  {stats?.evidencesPending ?? 0} evidências pendentes
                </span>
              </div>
              <Link
                href={`/respondente/portfolio-recomendacoes?axisId=${row.axisId ?? ""}`}
                className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
              >
                Ver recomendações
                <ChevronRight className="h-3 w-3" aria-hidden />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
