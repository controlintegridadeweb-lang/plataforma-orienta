"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import { workflowStatusEntry } from "@/lib/domain/status-registry";
import type { RespondentEvidenceStatus } from "@/lib/evidences/respondent-status";

type Props = {
  status: RespondentEvidenceStatus;
  /** Mostra a descricao curta abaixo do badge (apenas em desktop). */
  showDescription?: boolean;
};

export function RespondentStatusBadge({ status, showDescription }: Props) {
  const meta = workflowStatusEntry("evidence_respondent", status);
  return (
    <span className="inline-flex flex-col gap-1">
      <WorkflowStatusBadge
        domain="evidence_respondent"
        status={status}
        ariaPrefix="Status da evidência"
      />
      {showDescription ? (
        <span className="text-micro text-slate-500">{meta.description}</span>
      ) : null}
    </span>
  );
}
