"use client";

import type { ReactNode } from "react";
import { typography } from "@/lib/design-system";

type Props = {
  recommendationText: string;
  actionCount: number;
  headerActions?: ReactNode;
  children: ReactNode;
};

/** Bloco recomendação + ações na visão agrupada por formulário. */
export function ActionPlanRecommendationCard({
  recommendationText,
  actionCount,
  headerActions,
  children,
}: Props) {
  return (
    <article className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] transition hover:border-slate-300 hover:shadow-[var(--shadow-card-hover)]">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className={typography.meta}>Recomendação</p>
            <p className="text-sm leading-relaxed text-slate-800 sm:text-[0.9375rem]">
              {recommendationText}
            </p>
          </div>
          {headerActions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
          ) : null}
        </div>
        <div className="space-y-3 border-t border-slate-100 pt-4">
          <p className="text-xs font-medium text-slate-600">
            Ações cadastradas ({actionCount})
          </p>
          {children}
        </div>
      </div>
    </article>
  );
}
