import { describe, expect, it } from "vitest";
import type { FamiEvolutionPoint, FamiSnapshot } from "@/lib/fami/queries";
import {
  evolutionDelta,
  goalProgress,
  interpretSnapshot,
  levelFromPercentage,
  levelGoal,
  rankAxesByImpact,
} from "./respondent-presentation";

describe("levelFromPercentage", () => {
  it("mapeia os 5 niveis pelos limiares", () => {
    expect(levelFromPercentage(0)).toBe(1);
    expect(levelFromPercentage(25)).toBe(1);
    expect(levelFromPercentage(25.01)).toBe(2);
    expect(levelFromPercentage(50)).toBe(2);
    expect(levelFromPercentage(50.01)).toBe(3);
    expect(levelFromPercentage(75)).toBe(3);
    expect(levelFromPercentage(75.01)).toBe(4);
    expect(levelFromPercentage(90)).toBe(4);
    expect(levelFromPercentage(91)).toBe(5);
    expect(levelFromPercentage(100)).toBe(5);
  });
});

describe("levelGoal", () => {
  it("indica gap para o proximo nivel", () => {
    const g = levelGoal(60);
    expect(g.current).toBe(3);
    expect(g.next).toBe(4);
    expect(g.gap).toBeGreaterThan(0);
  });
  it("nivel 5 nao tem proximo", () => {
    const g = levelGoal(95);
    expect(g.current).toBe(5);
    expect(g.next).toBeNull();
  });
});

describe("rankAxesByImpact", () => {
  it("ordena pelo impacto descendente e marca criticos/avancados", () => {
    const ranked = rankAxesByImpact([
      { axisName: "A", percentage: 30, maturityLevel: 2 },
      { axisName: "B", percentage: 80, maturityLevel: 4 },
      { axisName: "C", percentage: 10, maturityLevel: 1 },
    ]);
    expect(ranked[0]!.axisName).toBe("C");
    expect(ranked[ranked.length - 1]!.axisName).toBe("B");
    expect(ranked.find((r) => r.axisName === "B")!.isAdvanced).toBe(true);
    expect(ranked.find((r) => r.axisName === "A")!.isCritical).toBe(true);
  });
});

describe("evolutionDelta", () => {
  function makePoint(over: Partial<FamiEvolutionPoint> = {}): FamiEvolutionPoint {
    return {
      processingVersion: 1,
      createdAt: "2025-01-01",
      globalPercentage: 50,
      globalMaturityLevel: 2,
      axisPercentages: {},
      ...over,
    };
  }

  it("vazio retorna unknown", () => {
    const d = evolutionDelta([]);
    expect(d.delta).toBeNull();
    expect(d.trend).toBe("unknown");
  });
  it("crescimento marca trend up", () => {
    const d = evolutionDelta([
      makePoint({ processingVersion: 1, globalPercentage: 40 }),
      makePoint({ processingVersion: 2, globalPercentage: 55 }),
    ]);
    expect(d.delta).toBe(15);
    expect(d.trend).toBe("up");
  });
  it("queda marca trend down", () => {
    const d = evolutionDelta([
      makePoint({ processingVersion: 1, globalPercentage: 70 }),
      makePoint({ processingVersion: 2, globalPercentage: 60 }),
    ]);
    expect(d.trend).toBe("down");
  });
});

describe("goalProgress", () => {
  it("calcula distancia para meta padrao 75", () => {
    const g = goalProgress(60);
    expect(g.target).toBe(75);
    expect(g.distance).toBe(15);
    expect(g.achieved).toBe(false);
  });
  it("achieved quando atingiu", () => {
    expect(goalProgress(90).achieved).toBe(true);
  });
});

describe("interpretSnapshot", () => {
  function makeSnapshot(over: Partial<FamiSnapshot> = {}): FamiSnapshot {
    return {
      formId: "form-1",
      organizationId: "org-1",
      processingVersion: 1,
      global: {
        percentage: 60,
        maturityLevel: 3,
        pointsObtained: 60,
        pointsPossible: 100,
        createdAt: "2025-01-01",
      },
      axes: [
        { axisName: "Governança", percentage: 80, maturityLevel: 4 },
        { axisName: "Pessoas", percentage: 40, maturityLevel: 2 },
      ],
      sections: [],
      ...over,
    };
  }

  it("gera summary e cartoes quando ha snapshot", () => {
    const r = interpretSnapshot(makeSnapshot());
    expect(r.summary).toContain("60");
    expect(r.cards.length).toBeGreaterThan(0);
    expect(r.topAxis?.axisName).toBe("Governança");
    expect(r.bottomAxis?.axisName).toBe("Pessoas");
  });
  it("snapshot vazio devolve summary neutro", () => {
    const r = interpretSnapshot(null);
    expect(r.cards).toHaveLength(0);
    expect(r.topAxis).toBeNull();
  });
});
