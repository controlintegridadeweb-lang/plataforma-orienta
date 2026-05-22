import type { ActionPlanListItem } from "./admin-service";
import type { ActionPlanAction } from "@/lib/domain/action-plans";

/**
 * Expande uma recomendacao com N acoes em N linhas sinteticas com `plans.length === 1`
 * (ou 0 acoes => uma linha sem plano).
 */
export function sliceRecommendationToSinglePlan(
  row: ActionPlanListItem,
  plan: ActionPlanAction | null,
  recommendationActionCount: number,
): ActionPlanListItem {
  const plans = plan ? [plan] : [];
  const slaLabel = plan?.slaLabel ?? "na";
  return { ...row, plans, slaLabel, recommendationActionCount };
}

export function actionPlanRowKey(planId: string | null | undefined, recommendationId: string): string {
  return planId ?? `np-${recommendationId}`;
}

export function expandActionPlanListRows(row: ActionPlanListItem): ActionPlanListItem[] {
  const n = row.plans.length;
  if (n === 0) return [sliceRecommendationToSinglePlan(row, null, 0)];
  return row.plans.map((plan) => sliceRecommendationToSinglePlan(row, plan, n));
}
