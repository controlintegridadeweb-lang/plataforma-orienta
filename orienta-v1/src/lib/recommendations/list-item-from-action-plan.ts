import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import type { RecommendationListItem } from "./admin-service";

/** Converte linha unificada de action-plans para o contrato de edição staff. */
export function recommendationListItemFromActionPlanRow(
  row: ActionPlanListItem,
): RecommendationListItem {
  return {
    id: row.recommendationId,
    formId: row.formId,
    formName: row.formName,
    formVersion: row.formVersion,
    organizationId: row.organizationId,
    organizationName: row.organizationName,
    questionId: "",
    questionPrompt: row.questionPrompt,
    sectionName: row.sectionName,
    axisName: row.axisName,
    recommendationType: row.recommendationType,
    originalText: row.recommendationText,
    currentText: row.recommendationText,
    status: row.recommendationStatus,
    createdAt: row.recommendationCreatedAt ?? "",
    updatedAt: row.recommendationCreatedAt ?? "",
    hasActionPlan: row.plans.length > 0,
  };
}
