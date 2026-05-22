import { describe, expect, it } from "vitest";
import {
  canSubmitYesWithEvidence,
  shouldShowEvidenceUI,
} from "./respondent-question-panel";
import type { WorkbenchRow } from "@/lib/workbench/load-workbench-payload";

function baseRow(overrides: Partial<WorkbenchRow> = {}): WorkbenchRow {
  return {
    questionId: "q1",
    prompt: "Pergunta?",
    metricAnswerType: "yes_no",
    requiresEvidence: true,
    recommendationText: "",
    axisName: "Eixo",
    sectionName: "Secao",
    responseId: null,
    answer: null,
    notes: null,
    evidenceId: null,
    evidenceTitle: null,
    evidenceDescription: null,
    externalLink: null,
    storagePath: null,
    validationStatus: null,
    isNotApplicable: false,
    ...overrides,
  };
}

describe("shouldShowEvidenceUI", () => {
  it("shows when Sim is saved and requires evidence", () => {
    expect(shouldShowEvidenceUI(baseRow({ answer: "yes" }))).toBe(true);
  });

  it("shows when Sim is pending locally", () => {
    expect(shouldShowEvidenceUI(baseRow(), { pendingYes: true })).toBe(true);
  });

  it("hides before Sim is chosen", () => {
    expect(shouldShowEvidenceUI(baseRow())).toBe(false);
  });
});

describe("canSubmitYesWithEvidence", () => {
  it("allows Sim without draft when question does not require evidence", () => {
    expect(
      canSubmitYesWithEvidence(baseRow({ requiresEvidence: false }), {
        kind: null,
        title: "",
        description: "",
        externalLink: "",
        storagePath: null,
      }),
    ).toBe(true);
  });

  it("blocks Sim when evidence is required and draft is empty", () => {
    expect(
      canSubmitYesWithEvidence(baseRow(), {
        kind: null,
        title: "",
        description: "",
        externalLink: "",
        storagePath: null,
      }),
    ).toBe(false);
  });

  it("blocks Sim when file exists but title is empty", () => {
    expect(
      canSubmitYesWithEvidence(baseRow(), {
        kind: "file",
        title: "",
        description: "",
        externalLink: "",
        storagePath: "org/form/a.pdf",
      }),
    ).toBe(false);
  });

  it("does not pass with evidenceId only and no attachment or title", () => {
    expect(
      canSubmitYesWithEvidence(
        baseRow({ evidenceId: "ev-1", storagePath: null, externalLink: null, evidenceTitle: null }),
        {
          kind: null,
          title: "",
          description: "",
          externalLink: "",
          storagePath: null,
        },
      ),
    ).toBe(false);
  });
});
