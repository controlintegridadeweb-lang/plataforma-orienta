import { describe, expect, it } from "vitest";
import { calculateFami } from "./fami";

describe("calculateFami", () => {
  it("aplica pontuacao ponderada corretamente", () => {
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
        validationStatus: "valid",
      },
      {
        id: "q3",
        axisId: "soc",
        sectionId: "s2",
        famiEnabled: true,
        requiresEvidence: true,
        answer: "partial",
      },
    ]);

    expect(result.global.pointsPossible).toBe(4);
    expect(result.global.pointsObtained).toBe(2.5);
    expect(result.global.percentage).toBe(62.5);
    expect(result.global.maturityLevel).toBe(3);
  });
});
