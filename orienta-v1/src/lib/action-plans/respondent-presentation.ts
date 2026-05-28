import type { LucideIcon } from "lucide-react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { RESPONDENT_ACTION_PLAN_VIEW_REGISTRY } from "@/lib/domain/status-registry";
import type { ActionPlanView } from "@/lib/domain/workflow-status-keys";

export type { ActionPlanView };

export type ActionPlanViewMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
  columnBg: string;
};

export const ACTION_PLAN_VIEW_META: Record<ActionPlanView, ActionPlanViewMeta> = Object.fromEntries(
  (Object.keys(RESPONDENT_ACTION_PLAN_VIEW_REGISTRY) as ActionPlanView[]).map((k) => {
    const e = RESPONDENT_ACTION_PLAN_VIEW_REGISTRY[k];
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
  }),
) as Record<ActionPlanView, ActionPlanViewMeta>;

function pickDisplayPlan(plans: ActionPlanAction[]): ActionPlanAction | null {
  const open = plans.find((p) => p.status !== "completed" && p.status !== "cancelled");
  return open ?? plans[0] ?? null;
}

export function deriveActionPlanView(input: {
  plans: ActionPlanAction[];
  slaLabel?: "ok" | "due_soon" | "overdue" | "na";
}): ActionPlanView {
  const plan = pickDisplayPlan(input.plans);
  if (!plan) return "no_plan";
  if (plan.status === "completed") return "completed";
  if (plan.status === "cancelled") return "paused";
  if (input.slaLabel === "overdue") return "overdue";
  if (plan.status === "in_progress") return "in_progress";
  return "not_started";
}

export function progressFromPlanStatus(status: PlanStatus | null | undefined): number {
  if (!status) return 0;
  const map: Record<PlanStatus, number> = {
    to_implement: 10,
    in_progress: 55,
    completed: 100,
    cancelled: 0,
  };
  return map[status] ?? 0;
}
