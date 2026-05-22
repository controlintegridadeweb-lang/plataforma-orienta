"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { statusPillBase } from "@/components/ui/status-pill";
import { AdminActionPlanProgress } from "@/components/admin-plano-acao/admin-action-plan-progress";
import { RespondentActionPlanProgress } from "@/components/respondente-plano-acao/respondent-action-plan-progress";
import type { AdminPlanItem } from "@/lib/action-plans/admin-monitoring";
import type { RespondentActionPlanItem } from "@/lib/action-plans/respondent-presentation";
import { staffPlanoAcaoDetailHref, staffAreaFromPathname } from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";

const k = formSurface.kanban;

function firstLine(text: string | null | undefined): string {
  const line = (text ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

function formatDueShort(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return null;
  }
}

type RespondentProps = {
  variant: "respondent";
  item: RespondentActionPlanItem;
  href: string;
};

type StaffProps = {
  variant: "staff";
  item: AdminPlanItem;
};

type Props = RespondentProps | StaffProps;

/** Card compacto do Kanban de plano de ação (respondente e admin). */
export function ActionPlanKanbanCard(props: Props) {
  if (props.variant === "respondent") {
    const { item, href } = props;
    const context = [item.axisName, item.sectionName, item.formName].filter(Boolean).join(" · ");
    const titleLine = item.hasPlan
      ? firstLine(item.description || item.title)
      : firstLine(item.recommendationText);
    const due = formatDueShort(item.dueDate);

    return (
      <Link href={href} className={k.card}>
        <ArrowUpRight
          className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100"
          aria-hidden
        />
        <p className={`${k.cardContext} pr-6`}>{context || "—"}</p>
        <p className={k.cardTitle}>{titleLine}</p>
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {item.totalActionsForRecommendation > 1 ? (
            <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
              {item.totalActionsForRecommendation} ações na recom.
            </span>
          ) : null}
          {!item.hasPlan ? (
            <span className={`${statusPillBase} ${formSurface.badge.muted}`}>Sem plano</span>
          ) : null}
          {item.isOverdue && item.view !== "overdue" ? (
            <span className={`${statusPillBase} ${formSurface.badge.danger}`}>Atrasada</span>
          ) : null}
          {item.isDueSoon ? (
            <span className={`${statusPillBase} ${formSurface.badge.warning}`}>≤ 7 dias</span>
          ) : null}
          {item.hasPlan && !item.hasResponsible ? (
            <span className={`${statusPillBase} ${formSurface.badge.muted}`}>Sem responsável</span>
          ) : null}
          {due ? (
            <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>{due}</span>
          ) : null}
        </div>
        <div className={k.cardFooter}>
          {item.hasResponsible ? (
            <p className="mb-2 line-clamp-1 text-[10px] text-slate-500">
              {item.responsibleName}
              {item.responsibleSector ? ` · ${item.responsibleSector}` : ""}
            </p>
          ) : null}
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-500">
            <span>Progresso</span>
            <span className="tabular-nums font-medium text-slate-700">{item.progress}%</span>
          </div>
          <RespondentActionPlanProgress value={item.progress} size="sm" />
        </div>
      </Link>
    );
  }

  const { item } = props;
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);
  const href = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
  const context = [item.organizationName, item.axisName, item.sectionName, item.formName]
    .filter(Boolean)
    .join(" · ");
  const titleLine = item.actionText?.trim()
    ? firstLine(item.actionText)
    : firstLine(item.recommendationText);
  const due = formatDueShort(item.dueDate);

  return (
    <Link href={href} className={k.card}>
      <ArrowUpRight
        className="absolute right-3 top-3 h-3.5 w-3.5 text-slate-400 opacity-0 transition group-hover:opacity-100"
        aria-hidden
      />
      <p className={`${k.cardContext} pr-6`}>{context || "—"}</p>
      <p className={k.cardTitle}>{titleLine}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {item.totalActionsForRecommendation > 1 ? (
          <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
            {item.totalActionsForRecommendation} linhas na recom.
          </span>
        ) : null}
        {item.isOverdue && item.view !== "overdue" && item.view !== "critical" ? (
          <span className={`${statusPillBase} ${formSurface.badge.danger}`}>Atrasada</span>
        ) : null}
        {item.isDueSoon ? (
          <span className={`${statusPillBase} ${formSurface.badge.warning}`}>≤ 7 dias</span>
        ) : null}
        {due ? (
          <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>{due}</span>
        ) : null}
      </div>
      <div className={k.cardFooter}>
        <p className="mb-2 line-clamp-1 text-[10px] text-slate-500">{item.lastActivityLabel}</p>
        <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-slate-500">
          <span>Progresso</span>
          <span className="tabular-nums text-slate-800">{item.progress}%</span>
        </div>
        <AdminActionPlanProgress value={item.progress} overdue={item.isOverdue} size="xs" showLabel={false} />
      </div>
    </Link>
  );
}
