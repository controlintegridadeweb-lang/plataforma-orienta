import { describe, expect, it } from "vitest";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import {
  deriveActionPlanView,
  progressForStatus,
  statusForProgress,
  summarize,
  toRespondentItem,
} from "./respondent-presentation";
import { computeActionSla } from "@/lib/domain/action-plans";

function makeRow(over: Partial<ActionPlanListItem> = {}): ActionPlanListItem {
  return {
    recommendationId: "rec-1",
    questionId: "q-1",
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

describe("deriveActionPlanView", () => {
  it("sem plano vira no_plan", () => {
    expect(deriveActionPlanView(makeRow())).toBe("no_plan");
  });
  it("respeita completed e cancelled", () => {
    expect(deriveActionPlanView(makeRow({ plans: [makePlan({ status: "completed" })] }))).toBe(
      "completed",
    );
    expect(deriveActionPlanView(makeRow({ plans: [makePlan({ status: "cancelled" })] }))).toBe(
      "paused",
    );
  });
  it("overdue tem precedencia sobre in_progress e to_implement", () => {
    expect(
      deriveActionPlanView(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "overdue" }),
      ),
    ).toBe("overdue");
    expect(
      deriveActionPlanView(
        makeRow({ plans: [makePlan({ status: "to_implement" })], slaLabel: "overdue" }),
      ),
    ).toBe("overdue");
  });
  it("in_progress sem atraso vira in_progress", () => {
    expect(deriveActionPlanView(makeRow({ plans: [makePlan({ status: "in_progress" })] }))).toBe(
      "in_progress",
    );
  });
  it("to_implement sem atraso vira not_started", () => {
    expect(deriveActionPlanView(makeRow({ plans: [makePlan({ status: "to_implement" })] }))).toBe(
      "not_started",
    );
  });
});

describe("progressForStatus / statusForProgress", () => {
  it("mapeia status -> progress", () => {
    expect(progressForStatus(null)).toBe(0);
    expect(progressForStatus("to_implement")).toBe(10);
    expect(progressForStatus("in_progress")).toBe(55);
    expect(progressForStatus("completed")).toBe(100);
    expect(progressForStatus("cancelled")).toBe(0);
  });
  it("mapeia progress -> status (atalhos 0/25/50/75/100)", () => {
    expect(statusForProgress(0)).toBe("to_implement");
    expect(statusForProgress(25)).toBe("in_progress");
    expect(statusForProgress(50)).toBe("in_progress");
    expect(statusForProgress(75)).toBe("in_progress");
    expect(statusForProgress(100)).toBe("completed");
  });
});

describe("toRespondentItem", () => {
  it("computa hasPlan, isOverdue, isDueSoon e progresso", () => {
    const item = toRespondentItem(
      makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "due_soon" }),
    );
    expect(item.hasPlan).toBe(true);
    expect(item.isDueSoon).toBe(true);
    expect(item.isOverdue).toBe(false);
    expect(item.progress).toBe(55);
    expect(item.view).toBe("in_progress");
    expect(item.rowKey).toBe("plan-1");
  });
  it("sem plano: progress=0 e view=no_plan", () => {
    const item = toRespondentItem(makeRow());
    expect(item.hasPlan).toBe(false);
    expect(item.progress).toBe(0);
    expect(item.view).toBe("no_plan");
    expect(item.rowKey).toBe("np-rec-1");
  });
});

describe("summarize", () => {
  it("conta planos e exclui sem plano do total", () => {
    const items = [
      toRespondentItem(makeRow()),
      toRespondentItem(makeRow({ plans: [makePlan({ status: "to_implement" })] })),
      toRespondentItem(makeRow({ plans: [makePlan({ status: "in_progress" })] })),
      toRespondentItem(
        makeRow({ plans: [makePlan({ status: "in_progress" })], slaLabel: "overdue" }),
      ),
      toRespondentItem(makeRow({ plans: [makePlan({ status: "completed" })] })),
      toRespondentItem(
        makeRow({
          plans: [makePlan({ status: "in_progress" })],
          slaLabel: "due_soon",
        }),
      ),
    ];
    const s = summarize(items);
    expect(s.total).toBe(5);
    expect(s.notStarted).toBe(1);
    expect(s.inProgress).toBe(2);
    expect(s.overdue).toBe(1);
    expect(s.completed).toBe(1);
    expect(s.dueSoon).toBe(1);
    expect(s.noPlan).toBe(1);
  });
});
