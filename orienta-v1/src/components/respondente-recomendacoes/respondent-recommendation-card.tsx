"use client";

import type { RespondentRecommendationItem } from "@/lib/recommendations/respondent-presentation";
import { RecommendationKanbanCard } from "@/components/recommendations-hub/recommendation-kanban-card";
import { respondentActionWorkspacePath } from "@/lib/navigation/respondent-portfolio-paths";

type Props = {
  item: RespondentRecommendationItem;
};

export function RespondentRecommendationCard({ item }: Props) {
  const href = respondentActionWorkspacePath(item.recommendationId, "acoes");
  return <RecommendationKanbanCard variant="respondent" item={item} href={href} />;
}
