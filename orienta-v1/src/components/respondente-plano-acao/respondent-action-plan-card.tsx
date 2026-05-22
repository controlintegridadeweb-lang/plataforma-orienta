"use client";

import type { RespondentActionPlanItem } from "@/lib/action-plans/respondent-presentation";
import { ActionPlanKanbanCard } from "@/components/action-plans/action-plan-kanban-card";
import { respondentPortfolioPlanPath } from "@/lib/navigation/respondent-portfolio-paths";

type Props = {
  item: RespondentActionPlanItem;
};

export function RespondentActionPlanCard({ item }: Props) {
  const href = respondentPortfolioPlanPath(item.recommendationId);
  return <ActionPlanKanbanCard variant="respondent" item={item} href={href} />;
}
