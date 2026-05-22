import { describe, expect, it } from "vitest";
import type { EvidenceListItem } from "./admin-service";
import { evidencesForRecommendationScope } from "./recommendation-scope";

function evidence(over: Partial<EvidenceListItem>): EvidenceListItem {
  return {
    id: "ev-1",
    responseId: "resp-1",
    organizationId: "org-1",
    organizationName: "Org",
    formId: "form-1",
    formName: "Form",
    formVersion: 1,
    questionId: "q-1",
    questionPrompt: "Prompt A",
    requiresEvidence: true,
    title: "T",
    description: "",
    evidenceType: "file",
    storagePath: null,
    externalLink: null,
    exceptionReason: null,
    submittedAt: "2025-01-01",
    submittedBy: "u",
    currentStatus: "pending",
    lastValidatedAt: null,
    lastJustification: null,
    history: [],
    ...over,
  };
}

describe("evidencesForRecommendationScope", () => {
  const items = [
    evidence({ id: "1", questionId: "q-1", questionPrompt: "Prompt A" }),
    evidence({ id: "2", questionId: "q-2", questionPrompt: "Prompt B" }),
  ];

  it("filtra por questionId quando há correspondência", () => {
    const out = evidencesForRecommendationScope(items, { questionId: "q-1" });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("1");
  });

  it("usa prompt exato quando questionId não encontra linhas", () => {
    const out = evidencesForRecommendationScope(items, {
      questionId: "q-missing",
      questionPrompt: "Prompt B",
    });
    expect(out).toHaveLength(1);
    expect(out[0]?.id).toBe("2");
  });
});
