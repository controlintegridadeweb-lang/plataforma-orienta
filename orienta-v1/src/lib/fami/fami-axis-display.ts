import { STRUCTURAL_AXIS_ORDER } from "@/lib/domain/action-plans";
import type { AxisMaturity } from "@/lib/fami/types";

export type MaturityLevel = 0 | 1 | 2 | 3 | 4 | 5;

/**
 * Ordena eixos pela sequência institucional (Governanca → Ambiental → Social).
 * Eixos não reconhecidos vão para o fim, mantendo ordem alfabética estável.
 */
export function sortAxesMaturity(axes: AxisMaturity[]): AxisMaturity[] {
  const order = STRUCTURAL_AXIS_ORDER as readonly string[];
  const indexOf = (name: string) => {
    const idx = order.indexOf(name);
    return idx >= 0 ? idx : order.length;
  };
  return [...axes].sort((a, b) => {
    const diff = indexOf(a.axisName) - indexOf(b.axisName);
    if (diff !== 0) return diff;
    return a.axisName.localeCompare(b.axisName, "pt-BR");
  });
}

/**
 * Mesma faixa usada por `calculateLevel` em `lib/domain/fami.ts`. Mantida
 * separada para uso em leituras agregadas sem importar a fórmula completa.
 */
export function levelFromPercentage(percentage: number): MaturityLevel {
  if (percentage <= 0) return 0;
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  if (percentage <= 90) return 4;
  return 5;
}

/**
 * Média aritmética segura dos percentuais informados. Retorna `null` quando
 * não há valor; nível derivado do percentual médio via `levelFromPercentage`.
 */
export function averageAxisPercentages(percentages: number[]): {
  percentage: number;
  maturityLevel: MaturityLevel;
} | null {
  const valid = percentages.filter(
    (p) => Number.isFinite(p) && p >= 0 && p <= 100,
  );
  if (valid.length === 0) return null;
  const avg = valid.reduce((sum, p) => sum + p, 0) / valid.length;
  const percentage = Number(avg.toFixed(2));
  return {
    percentage,
    maturityLevel: levelFromPercentage(percentage),
  };
}
