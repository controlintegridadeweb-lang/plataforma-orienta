"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import { EVIDENCE_VALIDATION_REGISTRY } from "@/lib/domain/status-registry";
import type { ValidationStatus } from "@/lib/evidences/schemas";

export const STATUS_LABELS: Record<ValidationStatus, string> = {
  pending: EVIDENCE_VALIDATION_REGISTRY.pending.label,
  approved: EVIDENCE_VALIDATION_REGISTRY.approved.label,
  invalidated: EVIDENCE_VALIDATION_REGISTRY.invalidated.label,
  adjustment_requested: EVIDENCE_VALIDATION_REGISTRY.adjustment_requested.label,
};

export function StatusBadge({ status }: { status: ValidationStatus }) {
  return (
    <WorkflowStatusBadge
      domain="evidence_validation"
      status={status}
      ariaPrefix="Status da evidência"
    />
  );
}
