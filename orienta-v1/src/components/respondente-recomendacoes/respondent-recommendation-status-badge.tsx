"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { RespondentRecommendationView } from "@/lib/domain/workflow-status-keys";

type Props = {
  view: RespondentRecommendationView;
  showIcon?: boolean;
  className?: string;
};

export function RespondentRecommendationStatusBadge({
  view,
  showIcon = false,
  className,
}: Props) {
  return (
    <WorkflowStatusBadge
      domain="respondent_recommendation_view"
      status={view}
      showIcon={showIcon}
      size="md"
      className={className}
    />
  );
}
