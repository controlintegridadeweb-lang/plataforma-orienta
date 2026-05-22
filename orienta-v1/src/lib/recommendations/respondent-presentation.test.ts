import { describe, expect, it } from "vitest";
import {
  deriveRespondentView,
  progressFromPlan,
  summarize,
  toRespondentItem,
  type RespondentRecommendationItem,
} from "./respondent-presentation";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";

function baseRow(over: Partial<ActionPlanListItem> = {}): ActionPlanListItem {
  return {
    recommendationId: "rec-1",
    formId: "form-1",
    formName: "Form 1",
    formVersion: 1,
    organizationId: "org-1",
    organizationName: "Org",
    questionPrompt: "Q",
    sectionName: "S",
    axisName: "A",
    recommendationType: "type",
    recommendationText: "texto",
        recommendationStatus: "open",
    plans: [],
    slaLabel: "na",
    ...over,
  };
}

describe("deriveRespondentView", () => {
  it("respeita resolved/dismissed do banco", () => {
    expect(deriveRespondentView({ status: "resolved", hasPlan: false })).toBe("resolved");
    expect(deriveRespondentView({ status: "dismissed", hasPlan: true })).toBe("dismissed");
  });
  it("in_progress sempre vira in_progress", () => {
    expect(deriveRespondentView({ status: "in_progress", hasPlan: false })).toBe("in_progress");
  });
  it("open com plano vira in_progress", () => {
    expect(deriveRespondentView({ status: "open", hasPlan: true })).toBe("in_progress");
  });
  it("open sem plano vira awaiting_action", () => {
    expect(deriveRespondentView({ status: "open", hasPlan: false })).toBe("awaiting_action");
  });
});

describe("progressFromPlan", () => {
  it("sem plano = 0", () => {
    expect(progressFromPlan(null)).toBe(0);
  });
  it("status do plano refletem buckets", () => {
    expect(
      progressFromPlan({ status: "to_implement" }),
    ).toBe(10);
    expect(
      progressFromPlan({ status: "in_progress" }),
    ).toBe(55);
    expect(
      progressFromPlan({ status: "completed" }),
    ).toBe(100);
    expect(
      progressFromPlan({ status: "cancelled" }),
    ).toBe(0);
  });
});

describe("toRespondentItem", () => {
  it("derive view e needsAction de forma consistente", () => {
    const row = baseRow({
      recommendationStatus: "open",
      plans: [],
          });
    const item = toRespondentItem(row);
    expect(item.view).toBe("awaiting_action");
    expect(item.needsAction).toBe(true);
    expect(item.hasPlan).toBe(false);
    expect(item.progress).toBe(0);
  });
});

describe("summarize", () => {
  it("conta buckets de view", () => {
    const items: RespondentRecommendationItem[] = [
      toRespondentItem(baseRow({ recommendationStatus: "open" })),
      toRespondentItem(
        baseRow({ recommendationStatus: "in_progress" }),
      ),
      toRespondentItem(
        baseRow({ recommendationStatus: "resolved" }),
      ),
    ];
    const s = summarize(items);
    expect(s.total).toBe(3);
    expect(s.inProgress).toBe(1);
    expect(s.resolved).toBe(1);
    expect(s.awaitingAction).toBe(1);
    expect(s.awaitingAction).toBe(1);
    expect(s.inProgress).toBe(1);
    expect(s.resolved).toBe(1);
  });
});
