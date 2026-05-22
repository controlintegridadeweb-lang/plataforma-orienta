import { describe, expect, it } from "vitest";
import {
  averageAxisPercentages,
  levelFromPercentage,
  sortAxesMaturity,
} from "./fami-axis-display";
import type { AxisMaturity } from "./types";

function axis(name: string, percentage: number, maturityLevel: number): AxisMaturity {
  return { axisId: name, axisName: name, percentage, maturityLevel };
}

describe("levelFromPercentage", () => {
  it("mapeia faixas conforme FAMI", () => {
    expect(levelFromPercentage(0)).toBe(0);
    expect(levelFromPercentage(10)).toBe(1);
    expect(levelFromPercentage(25)).toBe(1);
    expect(levelFromPercentage(26)).toBe(2);
    expect(levelFromPercentage(50)).toBe(2);
    expect(levelFromPercentage(51)).toBe(3);
    expect(levelFromPercentage(75)).toBe(3);
    expect(levelFromPercentage(75.1)).toBe(4);
    expect(levelFromPercentage(90)).toBe(4);
    expect(levelFromPercentage(95)).toBe(5);
    expect(levelFromPercentage(100)).toBe(5);
  });
});

describe("sortAxesMaturity", () => {
  it("ordena Governanca → Ambiental → Social", () => {
    const sorted = sortAxesMaturity([
      axis("Social", 30, 2),
      axis("Ambiental", 40, 2),
      axis("Governanca", 80, 4),
    ]);
    expect(sorted.map((a) => a.axisName)).toEqual([
      "Governanca",
      "Ambiental",
      "Social",
    ]);
  });

  it("eixos desconhecidos vão para o fim, mantendo ordem alfabética", () => {
    const sorted = sortAxesMaturity([
      axis("Inovação", 10, 1),
      axis("Cultura", 20, 1),
      axis("Governanca", 50, 2),
    ]);
    expect(sorted.map((a) => a.axisName)).toEqual([
      "Governanca",
      "Cultura",
      "Inovação",
    ]);
  });
});

describe("averageAxisPercentages", () => {
  it("retorna média e nível derivado do percentual", () => {
    const res = averageAxisPercentages([40, 60, 80]);
    expect(res).not.toBeNull();
    expect(res!.percentage).toBe(60);
    expect(res!.maturityLevel).toBe(3);
  });

  it("ignora valores inválidos", () => {
    const res = averageAxisPercentages([NaN, -5, 120, 50, 70]);
    expect(res).not.toBeNull();
    expect(res!.percentage).toBe(60);
  });

  it("retorna null quando não há valores válidos", () => {
    expect(averageAxisPercentages([])).toBeNull();
    expect(averageAxisPercentages([NaN, -1, 200])).toBeNull();
  });
});
