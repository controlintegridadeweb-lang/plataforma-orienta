import { RISK_META, type AdminPlanItem, type RiskLevel } from "@/lib/action-plans/admin-monitoring";
import { PLAN_STATUS_LABELS } from "@/components/plano-acao/plan-status-badge";
import type { PlanStatus } from "@/lib/action-plans/schemas";

export function firstLineAction(item: AdminPlanItem): string {
  const line = (item.actionText?.trim() || item.recommendationText.trim()).split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

export function formatPlanDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

export function planStatusLabel(status: PlanStatus | null): string {
  if (!status) return "Sem plano";
  return PLAN_STATUS_LABELS[status];
}

export function riskBadge(risk: RiskLevel): { label: string; className: string } {
  const meta = RISK_META[risk];
  return { label: meta.label, className: meta.badgeClasses };
}

export function recommendationContextLine(item: AdminPlanItem): string {
  const parts = [item.organizationName, item.axisName].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function multiActionHint(item: AdminPlanItem): string | null {
  if (item.totalActionsForRecommendation <= 1) return null;
  return `${item.totalActionsForRecommendation} ações nesta recomendação`;
}
