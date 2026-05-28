import { describe, expect, it } from "vitest";
import { calculateFami } from "./fami";

describe("calculateFami", () => {
  it("aplica pontuacao com peso uniforme corretamente", () => {
    const result = calculateFami([
      {
        id: "q1",
        axisId: "gov",
        sectionId: "s1",
        famiEnabled: true,
        requiresEvidence: false,
        answer: "yes",
      },
      {
        id: "q2",
        axisId: "gov",
        sectionId: "s1",
        famiEnabled: true,
        requiresEvidence: true,
        answer: "yes",
        validationStatus: "approved",
      },
      {
        id: "q3",
        axisId: "soc",
        sectionId: "s2",
        famiEnabled: true,
        requiresEvidence: true,
        answer: "not_applicable",
        isNotApplicable: true,
      },
    ]);

    expect(result.global.pointsPossible).toBe(2);
    expect(result.global.pointsObtained).toBe(2);
    expect(result.global.percentage).toBe(100);
    expect(result.global.maturityLevel).toBe(5);
  });
});
