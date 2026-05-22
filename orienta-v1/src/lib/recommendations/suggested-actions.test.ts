import { describe, expect, it } from "vitest";
import {
  buildActionTextFromSuggestion,
  normalizeActionTextKey,
} from "./suggested-actions";

describe("suggested-actions helpers", () => {
  it("normalizes action text keys for idempotency", () => {
    expect(normalizeActionTextKey("  Foo   Bar  ")).toBe("foo bar");
  });

  it("builds action text from title and description", () => {
    const text = buildActionTextFromSuggestion({
      title: "Capacitar equipe",
      description: "Treinamento anual",
      suggestedDeadlineDays: 90,
      suggestedResponsibleArea: "RH",
    });
    expect(text).toContain("Capacitar equipe");
    expect(text).toContain("Treinamento anual");
    expect(text.length).toBeGreaterThanOrEqual(5);
  });

  it("falls back when title alone is too short", () => {
    const text = buildActionTextFromSuggestion({
      title: "Ok",
      suggestedDeadlineDays: null,
      suggestedResponsibleArea: null,
    });
    expect(text).toContain("sugerida");
  });
});
