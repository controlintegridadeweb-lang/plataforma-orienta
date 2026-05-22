"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { AdminPlanView } from "@/lib/domain/workflow-status-keys";

type Props = {
  view: AdminPlanView;
  size?: "sm" | "md";
  withIcon?: boolean;
  presentation?: "pill" | "chip";
};

export function AdminActionPlanStatusBadge({
  view,
  size = "sm",
  withIcon = false,
  presentation = "pill",
}: Props) {
  return (
    <WorkflowStatusBadge
      domain="action_plan_admin_view"
      status={view}
      size={size === "md" ? "md" : "default"}
      showIcon={withIcon}
      presentation={presentation}
    />
  );
}
