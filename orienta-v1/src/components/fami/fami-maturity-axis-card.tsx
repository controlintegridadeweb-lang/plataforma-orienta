"use client";

import Link from "next/link";
import { formSurface } from "@/lib/layout/form-surface";
import { typography } from "@/lib/layout/design-system";

type Props = {
  axisName: string;
  percentage: number;
  maturityLevel: number;
  drillHref?: string;
};

/** Card de eixo — detalhamento estratégico com respiro interno. */
export function FamiMaturityAxisCard({
  axisName,
  percentage,
  maturityLevel,
  drillHref,
}: Props) {
  return (
    <article
      className={`flex h-full flex-col rounded-xl border border-slate-200/90 bg-white px-5 py-6 shadow-card transition hover:border-slate-300/90 sm:px-6 sm:py-7`}
    >
      <p className={formSurface.label}>{axisName}</p>
      <p className="mt-3 text-3xl font-semibold tabular-nums tracking-tight text-slate-900">
        {percentage.toFixed(1)}%
      </p>
      <p className={`mt-2 ${typography.meta}`}>Nível {maturityLevel}</p>
      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-brand-500/85 transition-all"
          style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
        />
      </div>
      {drillHref ? (
        <Link
          href={drillHref}
          className="mt-5 inline-flex text-xs font-semibold text-brand-800 hover:underline"
        >
          Ver recomendações deste eixo
        </Link>
      ) : (
        <span className="mt-5 block min-h-5" aria-hidden />
      )}
    </article>
  );
}
