"use client";

import Link from "next/link";
import { ChevronRight, ClipboardList, TrendingUp } from "lucide-react";
import type { AxisImpactRow } from "@/lib/fami/respondent-presentation";
import { formSurface } from "@/lib/form-surface";

type RecsByAxis = {
  open: number;
  total: number;
  awaitingAction: number;
};

type Props = {
  axes: AxisImpactRow[];
  /** Mapa axisName -> contadores. */
  statsByAxisName: Map<string, RecsByAxis>;
  recommendationsLink?: string;
};

export function RespondentFamiRecommendationsImpact({
  axes,
  statsByAxisName,
  recommendationsLink = "/respondente/portfolio-recomendacoes",
}: Props) {
  const rows = axes
    .map((axis) => ({
      ...axis,
      stats: statsByAxisName.get(axis.axisName) ?? { open: 0, total: 0, awaitingAction: 0 },
    }))
    .filter((row) => row.stats.open > 0 || row.impact > 0)
    .slice(0, 5);

  return (
    <section className={formSurface.card}>
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100/80 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100">
            <TrendingUp className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Impacto das recomendações</p>
            <p className="text-xs leading-relaxed text-slate-600">
              Estimativa de ganho de maturidade ao resolver as recomendações por eixo.
            </p>
          </div>
        </div>
        <Link
          href={recommendationsLink}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Ver recomendações
          <ChevronRight className="h-3.5 w-3.5" aria-hidden />
        </Link>
      </header>
      {rows.length === 0 ? (
        <p className="px-5 py-6 text-center text-xs text-slate-500">
          Nenhuma recomendação aberta com impacto estimado no momento.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <li
              key={row.axisId ?? row.axisName}
              className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="line-clamp-1 text-sm font-semibold text-slate-900" title={row.axisName}>
                  {row.axisName}
                </p>
                <p className="text-[11px] text-slate-500">
                  Resolver as recomendações deste eixo pode elevar sua pontuação em até{" "}
                  <strong className="font-semibold text-slate-700">
                    {row.impact.toFixed(1)} p.p.
                  </strong>
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">
                  <ClipboardList className="h-3 w-3" aria-hidden />
                  {row.stats.open} abertas / {row.stats.total}
                </span>
                {row.stats.awaitingAction > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 font-semibold text-violet-700">
                    {row.stats.awaitingAction} sem plano
                  </span>
                ) : null}
                <Link
                  href={`${recommendationsLink}?axisId=${row.axisId ?? ""}`}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-2 py-0.5 font-semibold text-brand-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  Abrir
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
