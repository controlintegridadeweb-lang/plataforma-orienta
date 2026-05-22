import { describe, expect, it } from "vitest";
import {
  formatSubmitRecommendationMessage,
  portfolioPendingLink,
} from "./post-save-feedback";

describe("post-save-feedback", () => {
  it("builds portfolio link with awaiting_action and formId", () => {
    const link = portfolioPendingLink("550e8400-e29b-41d4-a716-446655440000");
    expect(link).toContain("/respondente/portfolio-recomendacoes");
    expect(link).toContain("view=awaiting_action");
    expect(link).toContain("formId=550e8400");
  });

  it("formats submit messages", () => {
    expect(formatSubmitRecommendationMessage(0)).toContain("Nenhuma");
    expect(formatSubmitRecommendationMessage(1)).toContain("1 recomendação");
    expect(formatSubmitRecommendationMessage(3)).toContain("3 recomendações");
  });
});
