import type { LucideIcon } from "lucide-react";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { RESPONDENT_ACTION_PLAN_VIEW_REGISTRY } from "@/lib/domain/status-registry";
import type { ActionPlanView } from "@/lib/domain/workflow-status-keys";

export type { ActionPlanView };

export type StatusMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
  columnBg: string;
};

export const STATUS_META: Record<ActionPlanView, StatusMeta> = Object.fromEntries(
  (Object.keys(RESPONDENT_ACTION_PLAN_VIEW_REGISTRY) as ActionPlanView[]).map((k) => {
    const e = RESPONDENT_ACTION_PLAN_VIEW_REGISTRY[k];
    return [
      k,
      {
        label: e.label,
        description: e.description ?? "",
        icon: e.icon!,
        badgeClasses: e.colorClass,
        columnBg: e.columnBg ?? "",
      },
    ];
  }),
) as Record<ActionPlanView, StatusMeta>;

export type SlaLabel = ActionPlanListItem["slaLabel"];

export function deriveActionPlanView(item: ActionPlanListItem): ActionPlanView {
  const plan = item.plans[0] ?? null;
  if (!plan) return "no_plan";
  if (plan.status === "completed") return "completed";
  if (plan.status === "cancelled") return "paused";
  if (item.slaLabel === "overdue") return "overdue";
  return plan.status === "in_progress" ? "in_progress" : "not_started";
}

export const PROGRESS_BY_STATUS: Record<PlanStatus, number> = {
  to_implement: 10,
  in_progress: 55,
  completed: 100,
  cancelled: 0,
};

export const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;
export type ProgressStep = (typeof PROGRESS_STEPS)[number];

export function progressForStatus(status: PlanStatus | null | undefined): number {
  if (!status) return 0;
  return PROGRESS_BY_STATUS[status] ?? 0;
}

export function statusForProgress(progress: number): PlanStatus {
  const p = Math.max(0, Math.min(100, Math.round(progress)));
  if (p >= 100) return "completed";
  if (p > 0) return "in_progress";
  return "to_implement";
}

export function slaChipLabel(sla: SlaLabel): string | null {
  if (sla === "overdue") return "Atrasada";
  if (sla === "due_soon") return "Vence em 7 dias";
  return null;
}

export type RespondentActionPlanItem = {
  rowKey: string;
  recommendationId: string;
  planId: string | null;
  title: string;
  description: string;
  recommendationText: string;
  recommendationStatus: ActionPlanListItem["recommendationStatus"];
  recommendationType: string;
  axisName: string;
  sectionName: string;
  formId: string;
  formName: string;
  formVersion: number;
  questionPrompt: string;
  planStatus: PlanStatus | null;
  view: ActionPlanView;
  responsibleName: string;
  responsibleSector: string;
  dueDate: string | null;
  observations: string | null;
  updatedAt: string | null;
  hasPlan: boolean;
  hasResponsible: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  progress: number;
  slaLabel: SlaLabel;
  totalActionsForRecommendation: number;
};

export function toRespondentItem(row: ActionPlanListItem): RespondentActionPlanItem {
  const plan = row.plans[0] ?? null;
  const view = deriveActionPlanView(row);
  const baseTitle = (plan?.actionText ?? row.recommendationText ?? "").split(/\n+/)[0]?.trim();
  const title =
    baseTitle && baseTitle.length > 0
      ? baseTitle.length > 140
        ? `${baseTitle.slice(0, 137)}...`
        : baseTitle
      : "Ação sem título";
  return {
    rowKey: plan?.id ?? `np-${row.recommendationId}`,
    recommendationId: row.recommendationId,
    planId: plan?.id ?? null,
    title,
    description: plan?.actionText ?? row.recommendationText ?? "",
    recommendationText: row.recommendationText ?? "",
    recommendationStatus: row.recommendationStatus,
    recommendationType: row.recommendationType,
    axisName: row.axisName,
    sectionName: row.sectionName,
    formId: row.formId,
    formName: row.formName,
    formVersion: row.formVersion,
    questionPrompt: row.questionPrompt,
    planStatus: plan?.status ?? null,
    view,
    responsibleName: plan?.responsibleName ?? "",
    responsibleSector: plan?.responsibleSector ?? "",
    dueDate: plan?.dueDate || null,
    observations: plan?.observations ?? null,
    updatedAt: plan?.updatedAt || null,
    hasPlan: plan != null,
    hasResponsible: Boolean(plan?.responsibleName?.trim()),
    isOverdue: row.slaLabel === "overdue",
    isDueSoon: row.slaLabel === "due_soon",
    progress: plan ? progressForStatus(plan.status) : 0,
    slaLabel: row.slaLabel,
    totalActionsForRecommendation: row.recommendationActionCount ?? row.plans.length,
  };
}

export type RespondentActionPlanSummary = {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  overdue: number;
  dueSoon: number;
  noPlan: number;
};

export function summarize(items: RespondentActionPlanItem[]): RespondentActionPlanSummary {
  const s: RespondentActionPlanSummary = {
    total: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
    noPlan: 0,
  };
  for (const i of items) {
    if (i.hasPlan) s.total += 1;
    if (i.view === "not_started") s.notStarted += 1;
    if (i.view === "in_progress") s.inProgress += 1;
    if (i.view === "completed") s.completed += 1;
    if (i.view === "overdue") s.overdue += 1;
    if (i.view === "no_plan") s.noPlan += 1;
    if (i.isDueSoon) s.dueSoon += 1;
  }
  return s;
}
