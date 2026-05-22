"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import type { RespondentReportJobStatus } from "@/lib/reports/respondent-presentation";

type Props = {
  status: RespondentReportJobStatus;
  className?: string;
};

export function RespondentReportStatusBadge({ status, className = "" }: Props) {
  return (
    <WorkflowStatusBadge
      domain="report_job"
      status={status}
      size="compact"
      className={className}
      iconClassName={status === "processing" ? "animate-spin" : ""}
      ariaPrefix="Status do relatório"
    />
  );
}
