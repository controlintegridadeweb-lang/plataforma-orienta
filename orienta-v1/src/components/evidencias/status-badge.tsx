"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import { EVIDENCE_VALIDATION_REGISTRY } from "@/lib/domain/status-registry";
import type { ValidationStatus } from "@/lib/evidences/schemas";

export const STATUS_LABELS: Record<ValidationStatus, string> = {
  pending: EVIDENCE_VALIDATION_REGISTRY.pending.label,
  valid: EVIDENCE_VALIDATION_REGISTRY.valid.label,
  invalid: EVIDENCE_VALIDATION_REGISTRY.invalid.label,
  partially_valid: EVIDENCE_VALIDATION_REGISTRY.partially_valid.label,
  complementation_requested: EVIDENCE_VALIDATION_REGISTRY.complementation_requested.label,
  waived: EVIDENCE_VALIDATION_REGISTRY.waived.label,
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
