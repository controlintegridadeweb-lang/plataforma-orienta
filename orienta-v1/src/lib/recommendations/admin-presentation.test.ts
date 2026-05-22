import { describe, expect, it } from "vitest";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import {
  deriveAdminRecommendationView,
  groupByOrganization,
  groupByStatus,
  summarize,
  toAdminItem,
} from "./admin-presentation";
import { computeActionSla } from "@/lib/domain/action-plans";

function makeRow(over: Partial<ActionPlanListItem> = {}): ActionPlanListItem {
  return {
    recommendationId: "rec-1",
    formId: "form-1",
    formName: "Form 1",
    formVersion: 1,
    organizationId: "org-1",
    organizationName: "Org 1",
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

function makePlan(over: Partial<Omit<ActionPlanAction, "slaLabel">> = {}): ActionPlanAction {
  const base = {
    id: "plan-1",
    actionText: "ação",
    dueDate: "2099-01-01",
    responsibleSector: "TI",
    responsibleName: "Alice",
    status: "to_implement" as const,
    observations: null,
    updatedAt: "2025-01-01",
    ...over,
  };
  return { ...base, slaLabel: computeActionSla(base) };
}

describe("deriveAdminRecommendationView (8 views)", () => {
  it("dismissed do banco vira dismissed", () => {
    expect(deriveAdminRecommendationView(makeRow({ recommendationStatus: "dismissed" }))).toBe(
      "dismissed",
    );
  });
  it("resolved do banco vira completed", () => {
    expect(deriveAdminRecommendationView(makeRow({ recommendationStatus: "resolved" }))).toBe(
      "completed",
    );
  });
  it("open sem plano vira open", () => {
    expect(deriveAdminRecommendationView(makeRow())).toBe("open");
  });
  it("in_progress sem plano vira awaiting_plan", () => {
    expect(
      deriveAdminRecommendationView(makeRow({ recommendationStatus: "in_progress" })),
    ).toBe("awaiting_plan");
  });
  it("plano to_implement vira plan_submitted", () => {
    expect(deriveAdminRecommendationView(makeRow({ plans: [makePlan()] }))).toBe("plan_submitted");
  });
  it("plano in_progress sem atraso vira in_execution", () => {
    expect(
      deriveAdminRecommendationView(makeRow({ plans: [makePlan({ status: "in_progress" })] })),
    ).toBe("in_execution");
  });
  it("plano overdue tem precedencia", () => {
    expect(
      deriveAdminRecommendationView(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "overdue" }),
      ),
    ).toBe("overdue");
  });
  it("plano completed + recomendacao nao resolved vira in_review", () => {
    expect(
      deriveAdminRecommendationView(makeRow({ plans: [makePlan({ status: "completed" })] })),
    ).toBe("in_review");
  });
  it("plano completed + recomendacao resolved vira completed", () => {
    expect(
      deriveAdminRecommendationView(
        makeRow({
          plans: [makePlan({ status: "completed" })],
          recommendationStatus: "resolved",
        }),
      ),
    ).toBe("completed");
  });
  it("plano cancelled vira dismissed", () => {
    expect(
      deriveAdminRecommendationView(makeRow({ plans: [makePlan({ status: "cancelled" })] })),
    ).toBe("dismissed");
  });
});

describe("summarize (admin)", () => {
  it("agrega KPIs de plano, execucao e atraso", () => {
    const items = [
      toAdminItem(makeRow()),
      toAdminItem(makeRow({ plans: [makePlan()] })),
      toAdminItem(
        makeRow({
                    plans: [makePlan({ status: "in_progress" })],
        }),
      ),
      toAdminItem(
        makeRow({
                    plans: [makePlan({ status: "in_progress" })],
          slaLabel: "overdue",
        }),
      ),
      toAdminItem(
        makeRow({
                    plans: [makePlan({ status: "completed" })],
          recommendationStatus: "resolved",
        }),
      ),
    ];
    const s = summarize(items);
    expect(s.total).toBe(5);
    expect(s.withoutPlan).toBe(1);
    expect(s.withPlan).toBe(4);
    expect(s.inExecution).toBe(1);
    expect(s.overdue).toBe(1);
    expect(s.completed).toBe(1);
  });
});

describe("groupByOrganization", () => {
  it("agrupa e ordena org com mais atrasadas primeiro", () => {
    const items = [
      toAdminItem(makeRow({ organizationId: "a", organizationName: "Alfa" })),
      toAdminItem(
        makeRow({
          organizationId: "b",
          organizationName: "Beta",
          plans: [makePlan({ status: "in_progress" })],
          slaLabel: "overdue",
        }),
      ),
      toAdminItem(
        makeRow({
          organizationId: "b",
          organizationName: "Beta",
          plans: [makePlan({ status: "in_progress" })],
          slaLabel: "overdue",
        }),
      ),
    ];
    const groups = groupByOrganization(items);
    expect(groups).toHaveLength(2);
    expect(groups[0]!.organizationId).toBe("b");
    expect(groups[0]!.overdue).toBe(2);
    expect(groups[1]!.organizationId).toBe("a");
  });
  it("calcula executionPct = concluidas/total", () => {
    const items = [
      toAdminItem(
        makeRow({
          organizationId: "a",
          plans: [makePlan({ status: "completed" })],
          recommendationStatus: "resolved",
        }),
      ),
      toAdminItem(makeRow({ organizationId: "a" })),
    ];
    const groups = groupByOrganization(items);
    expect(groups[0]!.executionPct).toBe(50);
  });
});

describe("groupByStatus", () => {
  it("retorna em ordem priorizando overdue/awaiting_plan", () => {
    const items = [
      toAdminItem(makeRow({ plans: [makePlan({ status: "in_progress" })] })),
      toAdminItem(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "overdue" }),
      ),
      toAdminItem(makeRow({ recommendationStatus: "in_progress" })),
    ];
    const groups = groupByStatus(items);
    expect(groups[0]!.view).toBe("overdue");
    expect(groups[1]!.view).toBe("awaiting_plan");
  });
});
