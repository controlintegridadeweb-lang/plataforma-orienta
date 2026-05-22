import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  CircleSlash,
  Clock,
  Eye,
  Hourglass,
  PlayCircle,
  Send,
} from "lucide-react";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { ADMIN_RECOMMENDATION_VIEW_REGISTRY } from "@/lib/domain/status-registry";
import type { AdminRecommendationView } from "@/lib/domain/workflow-status-keys";
import type { RecommendationStatus } from "./schemas";

export type { AdminRecommendationView };

/**
 * Vocabulario do Administrador/Analista para Recomendacoes.
 *
 * Centraliza labels, cores, icones e regras de derivacao. Toda a UI consome
 * esta lib. Status visual estende os 4 estados do banco (`open`, `in_progress`,
 * `resolved`, `dismissed`) com 4 estados derivados do plano de acao + SLA.
 */

export type StatusMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
  columnBg: string;
};

export const STATUS_META: Record<AdminRecommendationView, StatusMeta> = Object.fromEntries(
  (Object.keys(ADMIN_RECOMMENDATION_VIEW_REGISTRY) as AdminRecommendationView[]).map((k) => {
    const e = ADMIN_RECOMMENDATION_VIEW_REGISTRY[k];
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
) as Record<AdminRecommendationView, StatusMeta>;

function pickDisplayPlan(row: ActionPlanListItem): ActionPlanAction | null {
  const open = row.plans.find(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  );
  return open ?? row.plans[0] ?? null;
}

export function deriveAdminRecommendationView(
  row: ActionPlanListItem,
): AdminRecommendationView {
  if (row.recommendationStatus === "dismissed") return "dismissed";
  if (row.recommendationStatus === "resolved") return "completed";

  const plan = pickDisplayPlan(row);
  if (!plan) {
    return row.recommendationStatus === "in_progress" ? "awaiting_plan" : "open";
  }

  if (plan.status === "completed") {
    return "in_review";
  }
  if (plan.status === "cancelled") {
    return "dismissed";
  }
  if (row.slaLabel === "overdue") return "overdue";
  if (plan.status === "in_progress") return "in_execution";
  return "plan_submitted";
}

export const PROGRESS_BY_STATUS: Record<PlanStatus, number> = {
  to_implement: 10,
  in_progress: 55,
  completed: 100,
  cancelled: 0,
};

export function progressFromPlan(plan: Pick<ActionPlanAction, "status"> | null): number {
  if (!plan) return 0;
  return PROGRESS_BY_STATUS[plan.status] ?? 0;
}

export function progressFromPlans(plans: ActionPlanAction[]): number {
  if (plans.length === 0) return 0;
  return Math.max(...plans.map((p) => PROGRESS_BY_STATUS[p.status] ?? 0));
}

export type AdminRecommendationItem = {
  recommendationId: string;
  questionId: string;
  plans: ActionPlanAction[];
  planId: string | null;
  organizationId: string;
  organizationName: string;
  formId: string;
  formName: string;
  formVersion: number;
  axisName: string;
  sectionName: string;
  questionPrompt: string;
  recommendationText: string;
  recommendationType: string;
  recommendationStatus: RecommendationStatus;
  view: AdminRecommendationView;
  hasPlan: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  planStatus: PlanStatus | null;
  responsibleName: string;
  responsibleSector: string;
  dueDate: string | null;
  updatedAt: string | null;
  progress: number;
  slaLabel: ActionPlanListItem["slaLabel"];
};

export function toAdminItem(row: ActionPlanListItem): AdminRecommendationItem {
  const view = deriveAdminRecommendationView(row);
  const plan = pickDisplayPlan(row);
  return {
    recommendationId: row.recommendationId,
    questionId: row.questionId,
    plans: row.plans,
    planId: plan?.id ?? null,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    formId: row.formId,
    formName: row.formName,
    formVersion: row.formVersion,
    axisName: row.axisName,
    sectionName: row.sectionName,
    questionPrompt: row.questionPrompt,
    recommendationText: row.recommendationText,
    recommendationType: row.recommendationType,
    recommendationStatus: row.recommendationStatus,
    view,
    hasPlan: row.plans.length > 0,
    isOverdue: row.slaLabel === "overdue",
    isDueSoon: row.slaLabel === "due_soon",
    planStatus: plan?.status ?? null,
    responsibleName: plan?.responsibleName ?? "",
    responsibleSector: plan?.responsibleSector ?? "",
    dueDate: plan?.dueDate || null,
    updatedAt: plan?.updatedAt || null,
    progress: progressFromPlans(row.plans),
    slaLabel: row.slaLabel,
  };
}

export type AdminRecommendationSummary = {
  total: number;
  withoutPlan: number;
  withPlan: number;
  inExecution: number;
  completed: number;
  overdue: number;
};

export function summarize(items: AdminRecommendationItem[]): AdminRecommendationSummary {
  const s: AdminRecommendationSummary = {
    total: items.length,
    withoutPlan: 0,
    withPlan: 0,
    inExecution: 0,
    completed: 0,
    overdue: 0,
  };
  for (const i of items) {
    if (i.hasPlan) s.withPlan += 1;
    else s.withoutPlan += 1;
    if (i.view === "in_execution") s.inExecution += 1;
    if (i.view === "completed") s.completed += 1;
    if (i.view === "overdue") s.overdue += 1;
  }
  return s;
}

export type OrganizationSummary = {
  organizationId: string;
  organizationName: string;
  total: number;
  inExecution: number;
  withoutPlan: number;
  overdue: number;
  completed: number;
  executionPct: number;
};

export function groupByOrganization(
  items: AdminRecommendationItem[],
): OrganizationSummary[] {
  const map = new Map<string, AdminRecommendationItem[]>();
  for (const i of items) {
    const arr = map.get(i.organizationId) ?? [];
    arr.push(i);
    map.set(i.organizationId, arr);
  }
  const groups: OrganizationSummary[] = [];
  for (const [orgId, rows] of map) {
    const counters: OrganizationSummary = {
      organizationId: orgId,
      organizationName: rows[0]?.organizationName ?? "(org)",
      total: rows.length,
      inExecution: 0,
      withoutPlan: 0,
      overdue: 0,
      completed: 0,
      executionPct: 0,
    };
    for (const r of rows) {
      if (r.view === "in_execution") counters.inExecution += 1;
      if (!r.hasPlan) counters.withoutPlan += 1;
      if (r.view === "overdue") counters.overdue += 1;
      if (r.view === "completed") counters.completed += 1;
    }
    counters.executionPct =
      counters.total === 0 ? 0 : Math.round((counters.completed / counters.total) * 100);
    groups.push(counters);
  }
  return groups.sort((a, b) => b.overdue - a.overdue || a.organizationName.localeCompare(b.organizationName, "pt-BR"));
}

/** Ordem das colunas no quadro Kanban (fluxo operacional). */
export const ADMIN_RECOMMENDATION_KANBAN_ORDER: AdminRecommendationView[] = [
  "overdue",
  "awaiting_plan",
  "open",
  "plan_submitted",
  "in_execution",
  "in_review",
  "completed",
  "dismissed",
];

export function groupByStatus(
  items: AdminRecommendationItem[],
): { view: AdminRecommendationView; rows: AdminRecommendationItem[] }[] {
  const order = ADMIN_RECOMMENDATION_KANBAN_ORDER;
  const map = new Map<AdminRecommendationView, AdminRecommendationItem[]>();
  for (const i of items) {
    const arr = map.get(i.view) ?? [];
    arr.push(i);
    map.set(i.view, arr);
  }
  return order
    .filter((v) => (map.get(v)?.length ?? 0) > 0)
    .map((v) => ({ view: v, rows: map.get(v) ?? [] }));
}

export const VIEW_ICONS: Record<AdminRecommendationView, LucideIcon> = {
  open: Circle,
  awaiting_plan: Hourglass,
  plan_submitted: Send,
  in_execution: PlayCircle,
  overdue: AlertTriangle,
  in_review: Eye,
  completed: CheckCircle2,
  dismissed: CircleSlash,
};

export { Clock, CalendarClock };
