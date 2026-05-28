import { describe, expect, it } from "vitest";
import { evidenceMetricsFromLatestStatuses } from "./evidence-metrics";

describe("evidenceMetricsFromLatestStatuses", () => {
  it("returns empty breakdown when there are no evidences", () => {
    expect(evidenceMetricsFromLatestStatuses([], new Map())).toEqual({
      pendingCount: 0,
      breakdown: { sem_evidencia: 0 },
    });
  });

  it("counts pending and adjustment_requested", () => {
    const latest = new Map<string, string>([
      ["e1", "pending"],
      ["e2", "approved"],
      ["e3", "adjustment_requested"],
    ]);
    const result = evidenceMetricsFromLatestStatuses(["e1", "e2", "e3"], latest);
    expect(result.pendingCount).toBe(2);
    expect(result.breakdown).toEqual({
      pending: 1,
      approved: 1,
      adjustment_requested: 1,
    });
  });

  it("treats evidences without validation row as pending", () => {
    const result = evidenceMetricsFromLatestStatuses(["e1"], new Map());
    expect(result.pendingCount).toBe(1);
    expect(result.breakdown.pending).toBe(1);
  });
});
