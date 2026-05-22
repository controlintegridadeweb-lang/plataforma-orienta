import { describe, expect, it } from "vitest";
import { nextStateFromEvent, shouldReprocessFami, validationAffectsScoring } from "./operational";

describe("operational helpers", () => {
  it("sinaliza eventos que exigem reprocessamento", () => {
    expect(shouldReprocessFami("formal_submit")).toBe(true);
    expect(shouldReprocessFami("validation_change")).toBe(true);
    expect(shouldReprocessFami("authorized_reopen")).toBe(true);
    expect(shouldReprocessFami("complementation_request")).toBe(false);
  });

  it("calcula transicoes de estado por evento", () => {
    expect(nextStateFromEvent("draft", "formal_submit")).toBe("submitted");
    expect(nextStateFromEvent("submitted", "validation_change")).toBe("under_review");
    expect(nextStateFromEvent("closed", "authorized_reopen")).toBe("draft");
  });

  it("identifica status que afetam pontuacao", () => {
    expect(validationAffectsScoring("valid")).toBe(true);
    expect(validationAffectsScoring("invalid")).toBe(true);
    expect(validationAffectsScoring("pending")).toBe(false);
  });
});
