"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { ActionPlanView } from "@/lib/domain/workflow-status-keys";

type Props = {
  view: ActionPlanView;
  showIcon?: boolean;
  className?: string;
};

export function RespondentActionPlanStatusBadge({
  view,
  showIcon = false,
  className,
}: Props) {
  return (
    <WorkflowStatusBadge
      domain="respondent_action_plan_view"
      status={view}
      showIcon={showIcon}
      className={className}
    />
  );
}
