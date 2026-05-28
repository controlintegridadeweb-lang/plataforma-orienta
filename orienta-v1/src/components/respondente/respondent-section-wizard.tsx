"use client";

import {
  RespondentSectionQuestions,
  type RespondentSectionGroup,
  type EvidenceDraft,
} from "./respondent-question-panel";
import type { WorkbenchRow } from "@/lib/workbench/load-workbench-payload";

type Props = {
  groupedBySection: RespondentSectionGroup[];
  currentSectionIndex: number;
  stepDirection: "forward" | "back";
  evidenceDrafts: Record<string, EvidenceDraft>;
  onEvidenceDraftChange: (questionId: string, patch: Partial<EvidenceDraft>) => void;
  onFileSelected: (row: WorkbenchRow, file: File) => void;
  onRemoveAttachment?: (row: WorkbenchRow) => void | Promise<void>;
  onSelectAnswer: (row: WorkbenchRow, value: "yes" | "no" | "not_applicable") => void;
  disabled?: boolean;
  activeQuestionId?: string | null;
  uploadingQuestionId?: string | null;
  pendingYesQuestionIds?: ReadonlySet<string>;
  evidenceFieldErrors?: Record<string, import("@/lib/workbench/validate-yes-evidence").YesEvidenceFieldErrors>;
};

export function RespondentSectionWizard({
  groupedBySection,
  currentSectionIndex,
  stepDirection,
  evidenceDrafts,
  pendingYesQuestionIds,
  ...questionProps
}: Props) {
  const sectionTotal = groupedBySection.length;
  const safeIndex = Math.min(Math.max(0, currentSectionIndex), Math.max(0, sectionTotal - 1));
  const section = groupedBySection[safeIndex];

  if (!section || sectionTotal === 0) {
    return null;
  }

  const stepProgressPct =
    sectionTotal > 0 ? Math.round(((safeIndex + 1) / sectionTotal) * 100) : 0;
  const stepLabel = `Etapa ${safeIndex + 1} de ${sectionTotal}`;
  const stepAnim =
    stepDirection === "back" ? "form-step-enter-back" : "form-step-enter-forward";

  return (
    <div key={safeIndex} className={stepAnim}>
      <RespondentSectionQuestions
        section={section}
        sectionIndex={safeIndex}
        stepLabel={stepLabel}
        stepProgressPct={stepProgressPct}
        evidenceDrafts={evidenceDrafts}
        pendingYesQuestionIds={pendingYesQuestionIds}
        {...questionProps}
      />
    </div>
  );
}
