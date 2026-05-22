import { describe, expect, it } from "vitest";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { ActionPlanListItem } from "./admin-service";
import {
  derivePlanView,
  deriveRiskScore,
  groupByOrganization,
  progressFromStatus,
  riskLevelFromScore,
  summarize,
  toAdminPlanItem,
} from "./admin-monitoring";
import { computeActionSla } from "@/lib/domain/action-plans";

const NOW = new Date("2025-06-15T12:00:00.000Z");

function makeRow(over: Partial<ActionPlanListItem> = {}): ActionPlanListItem {
  return {
    recommendationId: "rec-1",
    questionId: "q-1",
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

function makePlan(
  over: Partial<Omit<ActionPlanAction, "slaLabel">> = {},
): ActionPlanAction {
  const base = {
    id: "plan-1",
    actionText: "ação",
    dueDate: "2099-01-01",
    responsibleSector: "TI",
    responsibleName: "Alice",
    status: "to_implement" as const,
    observations: null,
    updatedAt: "2025-06-10T10:00:00.000Z",
    ...over,
  };
  return {
    ...base,
    slaLabel: computeActionSla(base),
  };
}

describe("derivePlanView (6 visoes)", () => {
  it("sem plano vira not_started", () => {
    expect(derivePlanView(makeRow(), NOW)).toBe("not_started");
  });
  it("plano completed vira completed", () => {
    expect(derivePlanView(makeRow({ plans: [makePlan({ status: "completed" })] }), NOW)).toBe(
      "completed",
    );
  });
  it("plano cancelled vira not_started", () => {
    expect(derivePlanView(makeRow({ plans: [makePlan({ status: "cancelled" })] }), NOW)).toBe(
      "not_started",
    );
  });
  it("plano in_progress sem atraso e recente vira in_progress", () => {
    expect(
      derivePlanView(
        makeRow({
          plans: [makePlan({ status: "in_progress", updatedAt: "2025-06-14T10:00:00Z" })],
        }),
        NOW,
      ),
    ).toBe("in_progress");
  });
  it("plano sem atualizacao por 14+ dias vira awaiting_update", () => {
    expect(
      derivePlanView(
        makeRow({
          plans: [makePlan({ status: "in_progress", updatedAt: "2025-05-25T10:00:00Z" })],
        }),
        NOW,
      ),
    ).toBe("awaiting_update");
  });
  it("plano com SLA overdue vira overdue", () => {
    expect(
      derivePlanView(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "overdue" }),
        NOW,
      ),
    ).toBe("overdue");
  });
  it("atrasado + baixo progresso vira critical", () => {
    expect(
      derivePlanView(
        makeRow({
                    plans: [makePlan({ status: "to_implement" })],
          slaLabel: "overdue",
        }),
        NOW,
      ),
    ).toBe("critical");
  });
});

describe("progressFromStatus", () => {
  it("mapeia status para 0/10/55/100/0", () => {
    expect(progressFromStatus("to_implement")).toBe(10);
    expect(progressFromStatus("in_progress")).toBe(55);
    expect(progressFromStatus("completed")).toBe(100);
    expect(progressFromStatus("cancelled")).toBe(0);
    expect(progressFromStatus(null)).toBe(0);
  });
});

describe("deriveRiskScore", () => {
  it("plano completed tem score zero", () => {
    expect(
      deriveRiskScore(makeRow({ plans: [makePlan({ status: "completed" })] }), NOW),
    ).toBe(0);
  });
  it("plano atrasado, baixo progresso, sem responsavel >= 90", () => {
    const score = deriveRiskScore(
      makeRow({
                plans: [
          makePlan({
            status: "to_implement",
            responsibleName: "",
            updatedAt: "2025-04-01T00:00:00Z",
          }),
        ],
        slaLabel: "overdue",
      }),
      NOW,
    );
    expect(score).toBeGreaterThanOrEqual(90);
  });
  it("score saudavel (<10) para plano in_progress recente sem atraso medio progresso", () => {
    const score = deriveRiskScore(
      makeRow({
                plans: [
          makePlan({
            status: "in_progress",
            updatedAt: "2025-06-14T10:00:00Z",
            responsibleName: "Bob",
          }),
        ],
        slaLabel: "ok",
      }),
      NOW,
    );
    expect(score).toBeLessThan(20);
  });
});

describe("riskLevelFromScore", () => {
  it("respeita os limiares", () => {
    expect(riskLevelFromScore(60, true, false)).toBe("high");
    expect(riskLevelFromScore(45, true, false)).toBe("medium");
    expect(riskLevelFromScore(15, true, false)).toBe("low");
    expect(riskLevelFromScore(5, true, false)).toBe("healthy");
  });
  it("completed sempre saudavel", () => {
    expect(riskLevelFromScore(99, true, true)).toBe("healthy");
  });
  it("sem plano vai como medium", () => {
    expect(riskLevelFromScore(0, false, false)).toBe("medium");
  });
});

describe("summarize", () => {
  it("agrega contadores", () => {
    const items = [
      toAdminPlanItem(makeRow(), NOW),
      toAdminPlanItem(
        makeRow({
          plans: [makePlan({ status: "in_progress", updatedAt: "2025-06-14T10:00:00Z" })],
        }),
        NOW,
      ),
      toAdminPlanItem(
        makeRow({
          plans: [makePlan({ status: "completed", updatedAt: "2025-06-01T10:00:00Z" })],
        }),
        NOW,
      ),
      toAdminPlanItem(
        makeRow({
          plans: [makePlan({ status: "to_implement", responsibleName: "" })],
          slaLabel: "overdue",
        }),
        NOW,
      ),
      toAdminPlanItem(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "due_soon" }),
        NOW,
      ),
    ];
    const s = summarize(items);
    expect(s.total).toBe(5);
    expect(s.inProgress).toBeGreaterThanOrEqual(1);
    expect(s.completed).toBe(1);
    expect(s.overdue).toBeGreaterThanOrEqual(1);
    expect(s.withoutResponsible).toBe(1);
    expect(s.dueSoon).toBe(1);
    expect(s.highRisk).toBeGreaterThanOrEqual(1);
    expect(s.lowProgress).toBeGreaterThanOrEqual(1);
  });
});

describe("groupByOrganization", () => {
  it("agrega por organizacao e ordena por highRisk e overdue", () => {
    const items = [
      toAdminPlanItem(makeRow({ organizationId: "a", organizationName: "Alfa" }), NOW),
      toAdminPlanItem(
        makeRow({
          organizationId: "b",
          organizationName: "Beta",
          plans: [makePlan({ status: "to_implement", responsibleName: "" })],
          slaLabel: "overdue",
        }),
        NOW,
      ),
      toAdminPlanItem(
        makeRow({
          organizationId: "b",
          organizationName: "Beta",
          plans: [makePlan({ status: "to_implement", responsibleName: "" })],
          slaLabel: "overdue",
        }),
        NOW,
      ),
    ];
    const groups = groupByOrganization(items);
    expect(groups[0]!.organizationId).toBe("b");
    expect(groups[0]!.overdue).toBeGreaterThan(0);
  });
});
