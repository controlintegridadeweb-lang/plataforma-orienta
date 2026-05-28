"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { statusPillBase } from "@/components/ui/status-pill";
import { formSurface } from "@/lib/form-surface";
import type { RespondentRecommendationItem } from "@/lib/recommendations/respondent-presentation";
import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";
import { AdminRecommendationProgress } from "@/components/admin-recomendacoes/admin-recommendation-progress";

const k = formSurface.kanban;

function firstLine(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

type RespondentProps = {
  variant: "respondent";
  item: RespondentRecommendationItem;
  href: string;
};

type StaffProps = {
  variant: "staff";
  item: AdminRecommendationItem;
  href: string;
};

type Props = RespondentProps | StaffProps;

/** Card compacto para quadro Kanban (clique abre o workspace). */
export function RecommendationKanbanCard(props: Props) {
  if (props.variant === "respondent") {
    const { item, href } = props;
    const context = [item.axisName, item.sectionName].filter(Boolean).join(" · ") || item.formName;
    const slaLabel =
      item.plan && item.slaLabel === "overdue"
        ? "Atrasada"
        : item.plan && item.slaLabel === "due_soon"
          ? "≤ 7 dias"
          : null;

    return (
      <Link href={href} className={k.card}>
        <ArrowUpRight
          className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        <p className={`${k.cardContext} pr-6`}>{context}</p>
        <p className={k.cardTitle}>{firstLine(item.recommendationText)}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
            {item.actionCount === 0
              ? "Sem ações"
              : item.actionCount === 1
                ? "1 ação"
                : `${item.actionCount} ações`}
          </span>
          {slaLabel ? (
            <span
              className={`${statusPillBase} ${
                item.slaLabel === "overdue" ? formSurface.badge.danger : formSurface.badge.warning
              }`}
            >
              {slaLabel}
            </span>
          ) : null}
        </div>
        <div className={k.cardFooter}>
          <div className="mb-1.5 flex items-center justify-between text-2xs text-slate-500">
            <span>Progresso</span>
            <span className="tabular-nums font-medium text-slate-700">{item.progress}%</span>
          </div>
          <RespondentRecommendationProgress value={item.progress} size="sm" />
        </div>
      </Link>
    );
  }

  const { item, href } = props;
  const context = [item.organizationName, item.axisName, item.sectionName]
    .filter(Boolean)
    .join(" · ");
  const slaLabel = item.hasPlan
    ? item.isOverdue
      ? "Atrasada"
      : item.isDueSoon
        ? "≤ 7 dias"
        : null
    : null;

  return (
    <Link href={href} className={k.card}>
      <ArrowUpRight
        className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />
      <p className={`${k.cardContext} pr-6`}>{context}</p>
      <p className={k.cardTitle}>{firstLine(item.recommendationText)}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
          {item.hasPlan
            ? `${item.plans.length} ${item.plans.length === 1 ? "ação" : "ações"}`
            : "Sem ações"}
        </span>
        {slaLabel ? (
          <span
            className={`${statusPillBase} ${
              item.isOverdue ? formSurface.badge.danger : formSurface.badge.warning
            }`}
          >
            {slaLabel}
          </span>
        ) : null}
      </div>
      <div className={k.cardFooter}>
        <div className="mb-1 flex items-center justify-between text-2xs font-medium text-slate-500">
          <span>Progresso</span>
          <span className="tabular-nums text-slate-800">{item.progress}%</span>
        </div>
        <AdminRecommendationProgress value={item.progress} overdue={item.isOverdue} size="xs" />
      </div>
    </Link>
  );
}
