import { describe, expect, it } from "vitest";
import { computeRespondentDashboardSummary } from "./respondent-dashboard-summary";
import type { RespondentProgress } from "@/lib/dashboards/queries";

const sample: RespondentProgress[] = [
  {
    formId: "a",
    formName: "F1",
    state: "submitted",
    totalQuestions: 10,
    answeredQuestions: 5,
    complementationRequests: 1,
  },
  {
    formId: "b",
    formName: "F2",
    state: "submitted",
    totalQuestions: 20,
    answeredQuestions: 10,
    complementationRequests: 2,
  },
];

describe("computeRespondentDashboardSummary", () => {
  it("aggregates KPIs from period-filtered forms", () => {
    expect(computeRespondentDashboardSummary(sample)).toEqual({
      openForms: 2,
      totalQuestions: 30,
      totalAnswered: 15,
      totalComplementation: 3,
      progressPct: 50,
    });
  });

  it("returns zeros for empty list", () => {
    expect(computeRespondentDashboardSummary([])).toEqual({
      openForms: 0,
      totalQuestions: 0,
      totalAnswered: 0,
      totalComplementation: 0,
      progressPct: 0,
    });
  });
});
