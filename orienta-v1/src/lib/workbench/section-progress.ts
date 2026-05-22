import type { WorkbenchRow } from "@/lib/workbench/load-workbench-payload";
import { validateYesWithEvidence } from "@/lib/workbench/validate-yes-evidence";

export type SectionEvidenceDraft = {
  kind: "file" | "link" | null;
  title: string;
  storagePath: string | null;
  externalLink: string;
};

export function draftFromRow(row: WorkbenchRow): SectionEvidenceDraft {
  return {
    kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
    title: row.evidenceTitle ?? "",
    storagePath: row.storagePath ?? null,
    externalLink: row.externalLink ?? "",
  };
}

export function isRowAnswerComplete(
  row: WorkbenchRow,
  draft: SectionEvidenceDraft,
  pendingYes: boolean,
): boolean {
  const effectiveAnswer = pendingYes ? "yes" : row.answer;
  if (!effectiveAnswer) return false;
  if (effectiveAnswer === "yes" && row.requiresEvidence) {
    return validateYesWithEvidence(
      {
        kind: draft.kind,
        title: draft.title,
        storagePath: draft.storagePath,
        externalLink: draft.externalLink,
      },
      {
        kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
        title: row.evidenceTitle,
        storagePath: row.storagePath,
        externalLink: row.externalLink,
      },
    ).ok;
  }
  return true;
}

export function countCompleteRows(
  rows: WorkbenchRow[],
  evidenceDrafts: Record<string, SectionEvidenceDraft>,
  pendingYesQuestionIds: ReadonlySet<string>,
): number {
  return rows.filter((row) => {
    const draft = evidenceDrafts[row.questionId] ?? draftFromRow(row);
    const pendingYes = pendingYesQuestionIds.has(row.questionId);
    return isRowAnswerComplete(row, draft, pendingYes);
  }).length;
}

export function sectionStorageKey(formId: string, organizationId: string): string {
  return `orienta.form.section.${formId}.${organizationId}`;
}
