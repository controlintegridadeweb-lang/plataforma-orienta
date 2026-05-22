import type { LucideIcon } from "lucide-react";
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  CircleOff,
  Clock,
  Hourglass,
  PlayCircle,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type { ActionPlanListItem } from "./admin-service";
import type { PlanStatus } from "./schemas";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import { ACTION_PLAN_ADMIN_VIEW_REGISTRY } from "@/lib/domain/status-registry";
import type { AdminPlanView } from "@/lib/domain/workflow-status-keys";

export type { AdminPlanView };

export type StatusMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
  columnBg: string;
};

export const STATUS_META: Record<AdminPlanView, StatusMeta> = Object.fromEntries(
  (Object.keys(ACTION_PLAN_ADMIN_VIEW_REGISTRY) as AdminPlanView[]).map((k) => {
    const e = ACTION_PLAN_ADMIN_VIEW_REGISTRY[k];
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
) as Record<AdminPlanView, StatusMeta>;

export type RiskLevel = "healthy" | "low" | "medium" | "high";

export type RiskMeta = {
  label: string;
  description: string;
  icon: LucideIcon;
  badgeClasses: string;
};

export const RISK_META: Record<RiskLevel, RiskMeta> = {
  healthy: {
    label: "Saudável",
    description: "Execução em dia, com atualização recente.",
    icon: ShieldCheck,
    badgeClasses: "bg-brand-50/70 text-brand-700",
  },
  low: {
    label: "Baixo risco",
    description: "Algum sinal de alerta, mas sem comprometimento.",
    icon: ShieldQuestion,
    badgeClasses: "bg-slate-50 text-slate-600",
  },
  medium: {
    label: "Médio risco",
    description: "Possível atraso ou baixa execução; acompanhar.",
    icon: AlertTriangle,
    badgeClasses: "bg-amber-50/70 text-amber-700",
  },
  high: {
    label: "Alto risco",
    description: "Atrasado, sem atualização e/ou sem responsável.",
    icon: ShieldAlert,
    badgeClasses: "bg-rose-50/70 text-rose-700",
  },
};

export const PROGRESS_BY_STATUS: Record<PlanStatus, number> = {
  to_implement: 10,
  in_progress: 55,
  completed: 100,
  cancelled: 0,
};

export function progressFromStatus(status: PlanStatus | null): number {
  if (!status) return 0;
  return PROGRESS_BY_STATUS[status] ?? 0;
}

const MS_PER_DAY = 86_400_000;

export function daysSince(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const ref = new Date(iso);
  if (Number.isNaN(ref.getTime())) return null;
  return Math.max(0, Math.floor((now.getTime() - ref.getTime()) / MS_PER_DAY));
}

export function lastActivityLabel(iso: string | null | undefined, now: Date = new Date()): string {
  const days = daysSince(iso, now);
  if (days == null) return "Sem atualização";
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  if (days < 14) return `Há ${days} dias`;
  if (days < 30) return `Há ${days} dias`;
  if (days < 60) return "Há mais de 1 mês";
  return "Há mais de 2 meses";
}

export function derivePlanView(
  row: ActionPlanListItem,
  now: Date = new Date(),
): AdminPlanView {
  const plan = row.plans[0] ?? null;
  if (!plan) return "not_started";
  if (plan.status === "completed") return "completed";
  if (plan.status === "cancelled") return "not_started";

  const isOverdue = row.slaLabel === "overdue";
  const days = daysSince(plan.updatedAt, now) ?? Number.POSITIVE_INFINITY;
  const stale = days >= 14;

  const lowProgress = progressFromStatus(plan.status) <= 25;
  if (isOverdue && lowProgress) {
    return "critical";
  }
  if (isOverdue) return "overdue";
  if (stale) return "awaiting_update";
  if (plan.status === "in_progress") return "in_progress";
  return "not_started";
}

export function deriveRiskScore(
  row: ActionPlanListItem,
  now: Date = new Date(),
): number {
  const plan = row.plans[0] ?? null;
  if (!plan) return 50;
  if (plan.status === "completed") return 0;
  if (plan.status === "cancelled") return 10;

  let score = 0;
  if (row.slaLabel === "overdue") score += 40;
  else if (row.slaLabel === "due_soon") score += 15;

  const days = daysSince(plan.updatedAt, now);
  if (days != null) {
    if (days > 30) score += 30;
    else if (days > 14) score += 20;
    else if (days > 7) score += 10;
  } else {
    score += 20;
  }

  const progress = progressFromStatus(plan.status);
  if (progress <= 25) score += 20;
  else if (progress < 50) score += 10;

  if (!plan.responsibleName?.trim()) score += 10;

  return Math.max(0, Math.min(100, score));
}

export function riskLevelFromScore(score: number, hasPlan: boolean, completed: boolean): RiskLevel {
  if (completed) return "healthy";
  if (!hasPlan) return "medium";
  if (score >= 60) return "high";
  if (score >= 30) return "medium";
  if (score >= 10) return "low";
  return "healthy";
}

export type AdminPlanItem = {
  rowKey: string;
  recommendationId: string;
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
  view: AdminPlanView;
  riskScore: number;
  risk: RiskLevel;
  hasPlan: boolean;
  isOverdue: boolean;
  isDueSoon: boolean;
  planStatus: PlanStatus | null;
  actionText: string;
  observations: string | null;
  responsibleName: string;
  responsibleSector: string;
  dueDate: string | null;
  updatedAt: string | null;
  daysSinceUpdate: number | null;
  lastActivityLabel: string;
  progress: number;
  slaLabel: ActionPlanListItem["slaLabel"];
  hasResponsible: boolean;
  totalActionsForRecommendation: number;
};

export function toAdminPlanItem(
  row: ActionPlanListItem,
  now: Date = new Date(),
): AdminPlanItem {
  const plan = row.plans[0] ?? null;
  const view = derivePlanView(row, now);
  const score = deriveRiskScore(row, now);
  const hasPlan = row.plans.length > 0;
  const completed = view === "completed";
  const risk = riskLevelFromScore(score, hasPlan, completed);
  const days = daysSince(plan?.updatedAt, now);

  return {
    rowKey: plan?.id ?? `np-${row.recommendationId}`,
    recommendationId: row.recommendationId,
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
    riskScore: score,
    risk,
    hasPlan,
    isOverdue: row.slaLabel === "overdue",
    isDueSoon: row.slaLabel === "due_soon",
    planStatus: plan?.status ?? null,
    actionText: plan?.actionText ?? "",
    observations: plan?.observations ?? null,
    responsibleName: plan?.responsibleName ?? "",
    responsibleSector: plan?.responsibleSector ?? "",
    dueDate: plan?.dueDate || null,
    updatedAt: plan?.updatedAt || null,
    daysSinceUpdate: days,
    lastActivityLabel: lastActivityLabel(plan?.updatedAt, now),
    progress: progressFromStatus(plan?.status ?? null),
    slaLabel: row.slaLabel,
    hasResponsible: Boolean(plan?.responsibleName?.trim()),
    totalActionsForRecommendation: row.recommendationActionCount ?? row.plans.length,
  };
}

export type AdminPlanSummary = {
  total: number;
  inProgress: number;
  completed: number;
  overdue: number;
  withoutResponsible: number;
  dueSoon: number;
  highRisk: number;
  lowProgress: number;
};

export function summarize(items: AdminPlanItem[]): AdminPlanSummary {
  const s: AdminPlanSummary = {
    total: items.length,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    withoutResponsible: 0,
    dueSoon: 0,
    highRisk: 0,
    lowProgress: 0,
  };
  for (const i of items) {
    if (i.view === "in_progress") s.inProgress += 1;
    if (i.view === "completed") s.completed += 1;
    if (i.view === "overdue" || i.view === "critical") s.overdue += 1;
    if (!i.hasResponsible && i.hasPlan) s.withoutResponsible += 1;
    if (i.isDueSoon) s.dueSoon += 1;
    if (i.risk === "high") s.highRisk += 1;
    if (i.hasPlan && i.view !== "completed" && i.progress <= 25) s.lowProgress += 1;
  }
  return s;
}

export type OrganizationSummary = {
  organizationId: string;
  organizationName: string;
  total: number;
  overdue: number;
  completed: number;
  inProgress: number;
  withoutResponsible: number;
  highRisk: number;
  averageProgress: number;
  risk: RiskLevel;
};

export function groupByOrganization(items: AdminPlanItem[]): OrganizationSummary[] {
  const map = new Map<string, AdminPlanItem[]>();
  for (const it of items) {
    const arr = map.get(it.organizationId) ?? [];
    arr.push(it);
    map.set(it.organizationId, arr);
  }
  const groups: OrganizationSummary[] = [];
  for (const [orgId, rows] of map) {
    let total = 0;
    let overdue = 0;
    let completed = 0;
    let inProgress = 0;
    let withoutResponsible = 0;
    let highRisk = 0;
    let progressSum = 0;
    for (const r of rows) {
      total += 1;
      if (r.view === "overdue" || r.view === "critical") overdue += 1;
      if (r.view === "completed") completed += 1;
      if (r.view === "in_progress") inProgress += 1;
      if (!r.hasResponsible && r.hasPlan) withoutResponsible += 1;
      if (r.risk === "high") highRisk += 1;
      progressSum += r.progress;
    }
    const avg = total === 0 ? 0 : Math.round(progressSum / total);
    let risk: RiskLevel = "healthy";
    const overdueRate = total === 0 ? 0 : overdue / total;
    const highRate = total === 0 ? 0 : highRisk / total;
    if (overdueRate >= 0.3 || highRate >= 0.3) risk = "high";
    else if (overdueRate > 0 || highRate > 0 || avg < 30) risk = "medium";
    else if (avg < 70) risk = "low";

    groups.push({
      organizationId: orgId,
      organizationName: rows[0]?.organizationName ?? "(org)",
      total,
      overdue,
      completed,
      inProgress,
      withoutResponsible,
      highRisk,
      averageProgress: avg,
      risk,
    });
  }
  return groups.sort(
    (a, b) =>
      b.highRisk - a.highRisk ||
      b.overdue - a.overdue ||
      a.organizationName.localeCompare(b.organizationName, "pt-BR"),
  );
}

export const VIEW_ICONS: Record<AdminPlanView, LucideIcon> = {
  not_started: Hourglass,
  in_progress: PlayCircle,
  awaiting_update: Clock,
  completed: CheckCircle2,
  overdue: AlertTriangle,
  critical: AlertOctagon,
};

export { CircleOff };
