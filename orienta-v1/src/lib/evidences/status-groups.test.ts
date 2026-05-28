import { describe, expect, it } from "vitest";
import {
  aggregateKpiCounts,
  statusToVisualGroup,
} from "./status-groups";
import type { ValidationStatus } from "./schemas";

describe("statusToVisualGroup", () => {
  it("mapeia os status do banco para grupos visuais", () => {
    expect(statusToVisualGroup("pending")).toBe("em_analise");
    expect(statusToVisualGroup("adjustment_requested")).toBe("complementacao");
    expect(statusToVisualGroup("approved")).toBe("aprovadas");
    expect(statusToVisualGroup("invalidated")).toBe("rejeitadas");
  });
});

describe("aggregateKpiCounts", () => {
  it("agrega em_analise com pendente e complementacao, e demais buckets", () => {
    const items: { currentStatus: ValidationStatus }[] = [
      { currentStatus: "pending" },
      { currentStatus: "adjustment_requested" },
      { currentStatus: "approved" },
      { currentStatus: "invalidated" },
    ];
    const r = aggregateKpiCounts(items);
    expect(r.total).toBe(4);
    expect(r.em_analise).toBe(2);
    expect(r.aprovadas).toBe(1);
    expect(r.rejeitadas).toBe(1);
  });
});
