import type { ActionPlanView } from "@/lib/domain/workflow-status-keys";
import type { AdminPlanView } from "@/lib/domain/workflow-status-keys";
import type { AdminRecommendationView } from "@/lib/domain/workflow-status-keys";
import type { RespondentRecommendationView } from "@/lib/domain/workflow-status-keys";

/**
 * Faixa superior das colunas — mesma lógica de `MetricCard` (color-mix suave, sem cores saturadas).
 */
export const RESPONDENT_RECOMMENDATION_COLUMN_ACCENT: Record<
  RespondentRecommendationView,
  string
> = {
  awaiting_action:
    "bg-[color-mix(in_srgb,var(--color-amber-500)_36%,transparent)]",
  in_progress: "bg-[color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]",
  open: "bg-[color-mix(in_srgb,var(--color-slate-400)_38%,transparent)]",
  resolved: "bg-[color-mix(in_srgb,var(--color-emerald-500)_36%,transparent)]",
  dismissed: "bg-[color-mix(in_srgb,var(--color-slate-400)_32%,transparent)]",
};

/** Ordem das colunas no quadro Kanban do Plano de ação (respondente). */
export const RESPONDENT_ACTION_PLAN_KANBAN_ORDER: ActionPlanView[] = [
  "no_plan",
  "overdue",
  "not_started",
  "in_progress",
  "completed",
  "paused",
];

export const RESPONDENT_ACTION_PLAN_COLUMN_ACCENT: Record<ActionPlanView, string> = {
  no_plan: "bg-[color-mix(in_srgb,var(--color-violet-500)_32%,transparent)]",
  overdue: "bg-[color-mix(in_srgb,var(--color-rose-500)_34%,transparent)]",
  not_started: "bg-[color-mix(in_srgb,var(--color-slate-400)_38%,transparent)]",
  in_progress: "bg-[color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]",
  completed: "bg-[color-mix(in_srgb,var(--color-emerald-500)_36%,transparent)]",
  paused: "bg-[color-mix(in_srgb,var(--color-slate-400)_32%,transparent)]",
};

/** Ordem das colunas no quadro Kanban de plano de ação (admin). */
export const ADMIN_ACTION_PLAN_KANBAN_ORDER: AdminPlanView[] = [
  "not_started",
  "awaiting_update",
  "in_progress",
  "overdue",
  "critical",
  "completed",
];

export const ADMIN_ACTION_PLAN_COLUMN_ACCENT: Record<AdminPlanView, string> = {
  not_started: "bg-[color-mix(in_srgb,var(--color-slate-400)_38%,transparent)]",
  awaiting_update: "bg-[color-mix(in_srgb,var(--color-amber-500)_36%,transparent)]",
  in_progress: "bg-[color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]",
  overdue: "bg-[color-mix(in_srgb,var(--color-rose-500)_34%,transparent)]",
  critical: "bg-[color-mix(in_srgb,var(--color-rose-600)_38%,transparent)]",
  completed: "bg-[color-mix(in_srgb,var(--color-emerald-500)_36%,transparent)]",
};

export const ADMIN_RECOMMENDATION_COLUMN_ACCENT: Record<AdminRecommendationView, string> = {
  open: "bg-[color-mix(in_srgb,var(--color-slate-400)_38%,transparent)]",
  awaiting_plan: "bg-[color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]",
  plan_submitted: "bg-[color-mix(in_srgb,var(--color-brand-600)_32%,transparent)]",
  in_execution: "bg-[color-mix(in_srgb,var(--color-brand-500)_40%,transparent)]",
  overdue: "bg-[color-mix(in_srgb,var(--color-rose-500)_34%,transparent)]",
  in_review: "bg-[color-mix(in_srgb,var(--color-brand-600)_28%,transparent)]",
  completed: "bg-[color-mix(in_srgb,var(--color-emerald-500)_36%,transparent)]",
  dismissed: "bg-[color-mix(in_srgb,var(--color-slate-400)_32%,transparent)]",
};
