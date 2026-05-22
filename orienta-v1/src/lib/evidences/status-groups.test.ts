import { describe, expect, it } from "vitest";
import {
  aggregateKpiCounts,
  statusToVisualGroup,
} from "./status-groups";
import type { ValidationStatus } from "./schemas";

describe("statusToVisualGroup", () => {
  it("mapeia os 6 status do banco para grupos visuais", () => {
    expect(statusToVisualGroup("pending")).toBe("em_analise");
    expect(statusToVisualGroup("complementation_requested")).toBe("complementacao");
    expect(statusToVisualGroup("valid")).toBe("aprovadas");
    expect(statusToVisualGroup("waived")).toBe("aprovadas");
    expect(statusToVisualGroup("invalid")).toBe("rejeitadas");
    expect(statusToVisualGroup("partially_valid")).toBe("rejeitadas");
  });
});

describe("aggregateKpiCounts", () => {
  it("agrega em_analise com pendente e complementacao, e demais buckets", () => {
    const items: { currentStatus: ValidationStatus }[] = [
      { currentStatus: "pending" },
      { currentStatus: "complementation_requested" },
      { currentStatus: "valid" },
      { currentStatus: "waived" },
      { currentStatus: "invalid" },
      { currentStatus: "partially_valid" },
    ];
    const r = aggregateKpiCounts(items);
    expect(r.total).toBe(6);
    expect(r.em_analise).toBe(2);
    expect(r.aprovadas).toBe(2);
    expect(r.rejeitadas).toBe(2);
  });
});
