import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { formSurface } from "@/lib/form-surface";
import { PLAN_STATUS_LABELS } from "@/components/plano-acao/plan-status-badge";
import type { PlanStatus } from "@/lib/action-plans/schemas";

export function firstLineRecommendation(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

export function formatRecommendationDate(iso: string | null | undefined): string {
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

export function deriveRecommendationPriority(item: AdminRecommendationItem): {
  label: string;
  className: string;
} {
  if (item.view === "overdue" || item.isOverdue) {
    return { label: "Alta", className: formSurface.badge.danger };
  }
  if (item.view === "in_execution" && item.isDueSoon) {
    return { label: "Média", className: formSurface.badge.warning };
  }
  if (!item.hasPlan || item.view === "awaiting_plan" || item.view === "open") {
    return { label: "Atenção", className: formSurface.badge.warning };
  }
  if (item.view === "completed") {
    return { label: "Baixa", className: formSurface.badge.neutral };
  }
  return { label: "Normal", className: formSurface.badge.neutral };
}

export function planLinkSummary(item: AdminRecommendationItem): {
  label: string;
  detail: string | null;
  tone: "neutral" | "brand" | "muted";
} {
  if (!item.hasPlan) {
    return { label: "Aguardando ação", detail: null, tone: "muted" };
  }
  const count = item.plans.length;
  const status = item.planStatus;
  const statusLabel = status ? PLAN_STATUS_LABELS[status as PlanStatus] : "Vinculado";
  return {
    label: count > 1 ? `${count} planos` : "Com plano",
    detail: statusLabel,
    tone: "brand",
  };
}
