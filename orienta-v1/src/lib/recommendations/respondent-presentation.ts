import type { LucideIcon } from "lucide-react";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import type { RecommendationStatus } from "./schemas";
import { deriveActionPlanView } from "@/lib/action-plans/respondent-presentation";
import type { ActionPlanView } from "@/lib/domain/workflow-status-keys";
import {
  RECOMMENDATION_REGISTRY,
  RESPONDENT_RECOMMENDATION_VIEW_REGISTRY,
} from "@/lib/domain/status-registry";
import type { RespondentRecommendationView } from "@/lib/domain/workflow-status-keys";

export { deriveActionPlanView, ACTION_PLAN_VIEW_META } from "@/lib/action-plans/respondent-presentation";
export type { ActionPlanViewMeta } from "@/lib/action-plans/respondent-presentation";
export type { ActionPlanView, RespondentRecommendationView };

export type StatusVariant = "neutral" | "info" | "success" | "muted";

export type StatusMeta = {
  label: string;
  description: string;
  variant: StatusVariant;
  icon: LucideIcon;
  badgeClasses: string;
};

const STATUS_VARIANT_BY_RECOMMENDATION: Record<RecommendationStatus, StatusVariant> = {
  open: "neutral",
  in_progress: "info",
  resolved: "success",
  dismissed: "muted",
};

export const STATUS_META: Record<RecommendationStatus, StatusMeta> = Object.fromEntries(
  (Object.keys(RECOMMENDATION_REGISTRY) as RecommendationStatus[]).map((k) => {
    const e = RECOMMENDATION_REGISTRY[k];
    return [
      k,
      {
        label: e.label,
        description: e.description ?? "",
        variant: STATUS_VARIANT_BY_RECOMMENDATION[k],
        icon: e.icon!,
        badgeClasses: e.colorClass,
      },
    ];
  }),
) as Record<RecommendationStatus, StatusMeta>;

export type RespondentViewMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
  columnBg: string;
};

export const RESPONDENT_VIEW_META: Record<RespondentRecommendationView, RespondentViewMeta> =
  Object.fromEntries(
    (Object.keys(RESPONDENT_RECOMMENDATION_VIEW_REGISTRY) as RespondentRecommendationView[]).map(
      (k) => {
        const e = RESPONDENT_RECOMMENDATION_VIEW_REGISTRY[k];
        return [
          k,
          {
            label: e.label,
            description: e.description ?? "",
            icon: e.icon!,
            badgeClasses: e.colorClass,
            columnBg: e.columnBg ?? "bg-slate-50/50",
          },
        ];
      },
    ),
  ) as Record<RespondentRecommendationView, RespondentViewMeta>;

/** Ordem das colunas no quadro Kanban (fluxo operacional). */
export const RESPONDENT_RECOMMENDATION_KANBAN_ORDER: RespondentRecommendationView[] = [
  "awaiting_action",
  "in_progress",
  "resolved",
  "dismissed",
];

export function deriveRespondentView(item: {
  status: RecommendationStatus;
  hasPlan: boolean;
}): RespondentRecommendationView {
  if (item.status === "resolved") return "resolved";
  if (item.status === "dismissed") return "dismissed";
  if (item.status === "in_progress") return "in_progress";
  return item.hasPlan ? "in_progress" : "awaiting_action";
}

function pickDisplayPlan(row: ActionPlanListItem): ActionPlanAction | null {
  const open = row.plans.find(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  return open ?? row.plans[0] ?? null;
}

export const PLAN_PROGRESS_PERCENT: Record<PlanStatus, number> = {
  to_implement: 10,
  in_progress: 55,
  completed: 100,
  cancelled: 0,
};

export function progressFromPlan(plan: Pick<ActionPlanAction, "status"> | null): number {
  if (!plan) return 0;
  return PLAN_PROGRESS_PERCENT[plan.status] ?? 0;
}

export function progressFromPlans(plans: ActionPlanAction[]): number {
  if (plans.length === 0) return 0;
  return Math.max(...plans.map((p) => PLAN_PROGRESS_PERCENT[p.status] ?? 0));
}

export type RespondentRecommendationSummary = {
  total: number;
  inProgress: number;
  resolved: number;
  awaitingAction: number;
};

export type RespondentRecommendationItem = {
  recommendationId: string;
  recommendationText: string;
  recommendationType: string;
  status: RecommendationStatus;
  view: RespondentRecommendationView;
  formId: string;
  formName: string;
  questionId?: string;
  questionPrompt: string;
  sectionName: string;
  axisName: string;
  createdAt?: string;
  updatedAt?: string;
  hasPlan: boolean;
  plans: ActionPlanAction[];
  plan: ActionPlanAction | null;
  actionCount: number;
  needsAction: boolean;
  progress: number;
  slaLabel: ActionPlanListItem["slaLabel"];
  planView: ActionPlanView;
};

export function toRespondentItem(row: ActionPlanListItem): RespondentRecommendationItem {
  const plan = pickDisplayPlan(row);
  const view = deriveRespondentView({
    status: row.recommendationStatus,
    hasPlan: row.plans.length > 0,
  });
  return {
    recommendationId: row.recommendationId,
    recommendationText: row.recommendationText,
    recommendationType: row.recommendationType,
    status: row.recommendationStatus,
    view,
    formId: row.formId,
    formName: row.formName,
    questionPrompt: row.questionPrompt,
    sectionName: row.sectionName,
    axisName: row.axisName,
    hasPlan: row.plans.length > 0,
    plans: row.plans,
    plan,
    createdAt: row.recommendationCreatedAt,
    actionCount: row.plans.length,
    needsAction: view === "awaiting_action",
    progress: progressFromPlans(row.plans),
    slaLabel: row.slaLabel,
    planView: deriveActionPlanView({ plans: row.plans, slaLabel: row.slaLabel }),
  };
}

export function summarize(items: RespondentRecommendationItem[]): RespondentRecommendationSummary {
  const s: RespondentRecommendationSummary = {
    total: items.length,
    inProgress: 0,
    resolved: 0,
    awaitingAction: 0,
  };
  for (const i of items) {
    if (i.view === "in_progress") s.inProgress += 1;
    if (i.view === "resolved") s.resolved += 1;
    if (i.view === "awaiting_action") s.awaitingAction += 1;
  }
  return s;
}
