import { describe, expect, it } from "vitest";
import { inferRecommendationType } from "./recommendation-engine";

describe("inferRecommendationType", () => {
  it("gera partial_implementation para resposta parcial", () => {
    const recommendation = inferRecommendationType({
      id: "1",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: false,
      answer: "partial",
    });

    expect(recommendation).toBe("partial_implementation");
  });

  it("gera insufficient_evidence para resposta positiva com evidencia invalida", () => {
    const recommendation = inferRecommendationType({
      id: "2",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "invalid",
    });

    expect(recommendation).toBe("insufficient_evidence");
  });
});
