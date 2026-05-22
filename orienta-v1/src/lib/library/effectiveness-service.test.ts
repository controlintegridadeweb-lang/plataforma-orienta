import { describe, expect, it } from "vitest";
import { classifyEffectiveness } from "./effectiveness-service";

describe("classifyEffectiveness", () => {
  it("returns green when acceptance and confidence are both above green thresholds (0..100 scale)", () => {
    expect(classifyEffectiveness(85, 90)).toBe("green");
    expect(classifyEffectiveness(70, 80)).toBe("green");
  });

  it("returns amber when within amber thresholds", () => {
    expect(classifyEffectiveness(65, 65)).toBe("amber");
    expect(classifyEffectiveness(50, 50)).toBe("amber");
  });

  it("returns red when below amber thresholds", () => {
    expect(classifyEffectiveness(40, 40)).toBe("red");
    expect(classifyEffectiveness(0, 0)).toBe("red");
  });

  it("does not mix scales (0..1 vs 0..100)", () => {
    expect(classifyEffectiveness(0.8, 0.9)).toBe("red");
  });

  it("falls back to acceptance rate when confidence is null", () => {
    expect(classifyEffectiveness(85, null)).toBe("green");
    expect(classifyEffectiveness(60, null)).toBe("amber");
    expect(classifyEffectiveness(30, null)).toBe("red");
  });
});
