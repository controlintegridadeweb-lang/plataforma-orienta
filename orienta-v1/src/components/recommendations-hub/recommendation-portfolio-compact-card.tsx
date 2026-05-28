"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock } from "lucide-react";
import { formSurface } from "@/lib/layout/form-surface";
import { typography } from "@/lib/layout/design-system";
import type { RespondentRecommendationItem } from "@/lib/recommendations/respondent-presentation";
import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import { AdminRecommendationProgress } from "@/components/admin-recomendacoes/admin-recommendation-progress";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";

function firstLine(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

type RespondentProps = {
  variant: "respondent";
  item: RespondentRecommendationItem;
  href: string;
  primaryCtaLabel?: string;
};

type StaffProps = {
  variant: "staff";
  item: AdminRecommendationItem;
  href: string;
};

type Props = RespondentProps | StaffProps;

export function RecommendationPortfolioCompactCard(props: Props) {
  if (props.variant === "respondent") {
    const { item, href, primaryCtaLabel = "Abrir plano de ação" } = props;
    const slaLabel =
      item.plan && item.slaLabel === "overdue"
        ? "Atrasada"
        : item.plan && item.slaLabel === "due_soon"
          ? "Prazo ≤ 7 dias"
          : null;
    const slaTone =
      item.slaLabel === "overdue"
        ? "bg-rose-50 text-micro font-semibold text-rose-800 ring-1 ring-rose-200"
        : "bg-amber-50 text-micro font-semibold text-amber-900 ring-1 ring-amber-200";

    return (
      <article
        id={`portfolio-rec-${item.recommendationId}`}
        className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
      >
        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <p className={`${typography.meta} line-clamp-1`}>
                {[item.axisName, item.sectionName].filter(Boolean).join(" · ") || "—"}
              </p>
              <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
                {firstLine(item.recommendationText)}
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-micro text-slate-600">
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200/80">
                  {item.actionCount === 0
                    ? "Sem ações"
                    : item.actionCount === 1
                      ? "1 ação"
                      : `${item.actionCount} ações`}
                </span>
                {slaLabel ? (
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${slaTone}`}>
                    <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
                    {slaLabel}
                  </span>
                ) : null}
              </div>
            </div>
            <RespondentRecommendationStatusBadge view={item.view} />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-micro text-slate-500">
              <span>Progresso</span>
              <span className="tabular-nums font-semibold text-slate-700">{item.progress}%</span>
            </div>
            <RespondentRecommendationProgress value={item.progress} size="sm" />
          </div>
          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Link
              href={href}
              className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1.5`}
            >
              {primaryCtaLabel}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </article>
    );
  }

  const { item, href } = props;
  const slaLabel = item.hasPlan
    ? item.isOverdue
      ? "Atrasada"
      : item.isDueSoon
        ? "Prazo ≤ 7 dias"
        : null
    : null;
  const slaTone = item.isOverdue
    ? "bg-rose-50 text-micro font-semibold text-rose-800 ring-1 ring-rose-200"
    : "bg-amber-50 text-micro font-semibold text-amber-900 ring-1 ring-amber-200";

  return (
    <article className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1 space-y-2">
            <p className={`${typography.meta} line-clamp-1`}>
              {[item.organizationName, item.axisName, item.sectionName].filter(Boolean).join(" · ")}
            </p>
            <h2 className="line-clamp-2 text-base font-semibold leading-snug text-slate-900">
              {firstLine(item.recommendationText)}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-micro text-slate-600">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-700 ring-1 ring-slate-200/80">
                {item.hasPlan
                  ? `${item.plans.length} ${item.plans.length === 1 ? "ação" : "ações"}`
                  : "Sem ações"}
              </span>
              {slaLabel ? (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${slaTone}`}>
                  <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
                  {slaLabel}
                </span>
              ) : null}
            </div>
          </div>
          <AdminRecommendationStatusBadge view={item.view} />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-micro text-slate-500">
            <span>Progresso</span>
            <span className="tabular-nums font-semibold text-slate-700">{item.progress}%</span>
          </div>
          <AdminRecommendationProgress value={item.progress} overdue={item.isOverdue} size="xs" />
        </div>
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <Link href={href} className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1.5`}>
            Abrir recomendação
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
