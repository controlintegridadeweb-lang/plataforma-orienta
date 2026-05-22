"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { AdminRecommendationView } from "@/lib/domain/workflow-status-keys";

type Props = {
  view: AdminRecommendationView;
  withIcon?: boolean;
  size?: "sm" | "md";
};

export function AdminRecommendationStatusBadge({
  view,
  withIcon = false,
  size = "sm",
}: Props) {
  return (
    <WorkflowStatusBadge
      domain="admin_recommendation_view"
      status={view}
      size={size === "md" ? "md" : "default"}
      showIcon={withIcon}
    />
  );
}
