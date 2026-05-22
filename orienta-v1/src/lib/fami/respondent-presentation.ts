import type { LucideIcon } from "lucide-react";
import {
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { AxisMaturity } from "@/lib/fami/types";
import type { FamiEvolutionPoint, FamiEvolutionYearPoint, FamiSnapshot } from "@/lib/fami/queries";
import {
  FAMI_MATURITY_LEVEL_REGISTRY,
  type FamiMaturityLevel,
} from "@/lib/domain/status-registry";

/**
 * Camada de apresentacao do FAMI para o painel do Respondente.
 *
 * Centraliza o vocabulario dos 5 niveis (label, descricao, cor, icone, gradiente),
 * regras de classificacao por percentual, interpretacao automatica do snapshot
 * (pontos fortes, criticos, oportunidades) e calculo de impacto estimado por eixo
 * para subsidiar mensagens executivas ("resolver X pode elevar Y p.p.").
 *
 * Nenhuma chamada a banco; apenas pure functions a partir do que ja vem da
 * rota `/api/admin/fami/snapshot`.
 */

// ---------------------------------------------------------------- NIVEIS

export type FamiLevel = 1 | 2 | 3 | 4 | 5;

export type LevelMeta = {
  level: FamiLevel;
  label: string;
  shortLabel: string;
  description: string;
  range: string;
  /** Limite superior inclusivo do nivel (em %). */
  upperBound: number;
  icon: LucideIcon;
  badgeClasses: string;
  ringColor: string;
  textColor: string;
  iconBg: string;
  iconColor: string;
};

const LEVEL_RING_TEXT: Record<
  FamiLevel,
  Pick<LevelMeta, "range" | "upperBound" | "ringColor" | "textColor" | "iconBg" | "iconColor">
> = {
  1: {
    range: "0% – 25%",
    upperBound: 25,
    ringColor: "stroke-rose-500",
    textColor: "text-rose-700",
    iconBg: "bg-rose-50",
    iconColor: "text-rose-600",
  },
  2: {
    range: "26% – 50%",
    upperBound: 50,
    ringColor: "stroke-amber-500",
    textColor: "text-amber-700",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-600",
  },
  3: {
    range: "51% – 75%",
    upperBound: 75,
    ringColor: "stroke-sky-500",
    textColor: "text-sky-700",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-600",
  },
  4: {
    range: "76% – 90%",
    upperBound: 90,
    ringColor: "stroke-indigo-500",
    textColor: "text-indigo-700",
    iconBg: "bg-indigo-50",
    iconColor: "text-indigo-600",
  },
  5: {
    range: "91% – 100%",
    upperBound: 100,
    ringColor: "stroke-emerald-500",
    textColor: "text-emerald-700",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-600",
  },
};

function buildLevelMeta(level: FamiLevel): LevelMeta {
  const reg = FAMI_MATURITY_LEVEL_REGISTRY[level as FamiMaturityLevel];
  const rt = LEVEL_RING_TEXT[level];
  const shortLabel =
    reg.label.includes("·") && reg.label.includes("Nível")
      ? reg.label.split("·").pop()!.trim()
      : reg.label;
  return {
    level,
    label: reg.label,
    shortLabel,
    description: reg.description ?? "",
    range: rt.range,
    upperBound: rt.upperBound,
    icon: reg.icon!,
    badgeClasses: reg.colorClass,
    ringColor: rt.ringColor,
    textColor: rt.textColor,
    iconBg: rt.iconBg,
    iconColor: rt.iconColor,
  };
}

export const LEVEL_META: Record<FamiLevel, LevelMeta> = {
  1: buildLevelMeta(1),
  2: buildLevelMeta(2),
  3: buildLevelMeta(3),
  4: buildLevelMeta(4),
  5: buildLevelMeta(5),
};

export const LEVEL_ORDER: FamiLevel[] = [1, 2, 3, 4, 5];

export function levelFromPercentage(percentage: number): FamiLevel {
  if (percentage <= 25) return 1;
  if (percentage <= 50) return 2;
  if (percentage <= 75) return 3;
  if (percentage <= 90) return 4;
  return 5;
}

export function levelMeta(level: number | null | undefined): LevelMeta {
  if (level === 1 || level === 2 || level === 3 || level === 4 || level === 5) {
    return LEVEL_META[level];
  }
  return LEVEL_META[1];
}

// ---------------------------------------------------------------- META / GAP

export type LevelGoal = {
  current: FamiLevel;
  next: FamiLevel | null;
  /** Percentual necessario para atingir o proximo nivel. */
  threshold: number;
  /** Pontos percentuais que faltam. */
  gap: number;
  /** Mensagem curta para badge/texto. */
  message: string;
};

export function levelGoal(percentage: number): LevelGoal {
  const current = levelFromPercentage(percentage);
  if (current === 5) {
    return {
      current,
      next: null,
      threshold: 100,
      gap: 0,
      message: "Nível máximo atingido — mantenha as práticas e revise evidências.",
    };
  }
  const meta = LEVEL_META[current];
  const threshold = meta.upperBound + 0.01;
  const gap = Math.max(0, Math.round((meta.upperBound + 0.5 - percentage) * 10) / 10);
  const next = (current + 1) as FamiLevel;
  const nextMeta = LEVEL_META[next];
  return {
    current,
    next,
    threshold,
    gap,
    message:
      gap > 0
        ? `Faltam ${gap.toFixed(1)} p.p. para atingir ${nextMeta.shortLabel} (Nível ${next}).`
        : `A próxima atualização pode elevar a maturidade ao Nível ${next}.`,
  };
}

// ---------------------------------------------------------------- IMPACTO POR EIXO

export type AxisImpactRow = {
  axisId: string | null;
  axisName: string;
  percentage: number;
  level: FamiLevel;
  /** Pontos percentuais que o eixo pode contribuir se atingir 100%. */
  impact: number;
  isCritical: boolean;
  isAdvanced: boolean;
};

export function rankAxesByImpact(axes: AxisMaturity[]): AxisImpactRow[] {
  if (axes.length === 0) return [];
  const N = axes.length;
  return axes
    .map((axis) => {
      const pct = Math.max(0, Math.min(100, axis.percentage));
      const level = levelFromPercentage(pct);
      const impact = Math.max(0, Math.round(((100 - pct) / N) * 10) / 10);
      return {
        axisId: axis.axisId ?? null,
        axisName: axis.axisName,
        percentage: pct,
        level,
        impact,
        isCritical: pct < 50,
        isAdvanced: pct >= 75,
      };
    })
    .sort((a, b) => b.impact - a.impact);
}

// ---------------------------------------------------------------- DELTA EVOLUÇÃO

export type EvolutionDelta = {
  currentPercentage: number | null;
  previousPercentage: number | null;
  /** Pontos percentuais ganhos desde o ciclo anterior (positivo bom). */
  delta: number | null;
  /** Crescimento percentual relativo. */
  growth: number | null;
  trend: "up" | "down" | "flat" | "unknown";
  /** Pontuacao das ultimas N versoes (para mini-sparkline). */
  sparkline: number[];
};

export function evolutionDelta(points: FamiEvolutionPoint[]): EvolutionDelta {
  if (points.length === 0) {
    return {
      currentPercentage: null,
      previousPercentage: null,
      delta: null,
      growth: null,
      trend: "unknown",
      sparkline: [],
    };
  }
  const sorted = [...points].sort(
    (a, b) => a.processingVersion - b.processingVersion,
  );
  const current = sorted[sorted.length - 1]?.globalPercentage ?? null;
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2]?.globalPercentage ?? null : null;
  const delta = current != null && previous != null
    ? Math.round((current - previous) * 10) / 10
    : null;
  const growth =
    current != null && previous != null && previous !== 0
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : null;
  let trend: EvolutionDelta["trend"] = "unknown";
  if (delta != null) {
    if (delta > 0.5) trend = "up";
    else if (delta < -0.5) trend = "down";
    else trend = "flat";
  }
  const sparkline = sorted
    .slice(-5)
    .map((p) => (typeof p.globalPercentage === "number" ? p.globalPercentage : 0));
  return { currentPercentage: current, previousPercentage: previous, delta, growth, trend, sparkline };
}

export function evolutionDeltaByYear(points: FamiEvolutionYearPoint[]): EvolutionDelta {
  if (points.length === 0) {
    return {
      currentPercentage: null,
      previousPercentage: null,
      delta: null,
      growth: null,
      trend: "unknown",
      sparkline: [],
    };
  }
  const sorted = [...points].sort((a, b) => a.year - b.year);
  const current = sorted[sorted.length - 1]?.globalPercentage ?? null;
  const previous = sorted.length >= 2 ? sorted[sorted.length - 2]?.globalPercentage ?? null : null;
  const delta =
    current != null && previous != null ? Math.round((current - previous) * 10) / 10 : null;
  const growth =
    current != null && previous != null && previous !== 0
      ? Math.round(((current - previous) / previous) * 1000) / 10
      : null;
  let trend: EvolutionDelta["trend"] = "unknown";
  if (delta != null) {
    if (delta > 0.5) trend = "up";
    else if (delta < -0.5) trend = "down";
    else trend = "flat";
  }
  const sparkline = sorted
    .slice(-5)
    .map((p) => (typeof p.globalPercentage === "number" ? p.globalPercentage : 0));
  return { currentPercentage: current, previousPercentage: previous, delta, growth, trend, sparkline };
}

export const TREND_META: Record<EvolutionDelta["trend"], {
  label: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}> = {
  up: {
    label: "Evolução positiva",
    icon: TrendingUp,
    color: "text-emerald-700",
    bg: "bg-emerald-50",
  },
  down: {
    label: "Queda de maturidade",
    icon: TrendingDown,
    color: "text-rose-700",
    bg: "bg-rose-50",
  },
  flat: {
    label: "Estável desde o último ciclo",
    icon: TrendingUp,
    color: "text-slate-600",
    bg: "bg-slate-50",
  },
  unknown: {
    label: "Sem histórico para comparar",
    icon: TrendingUp,
    color: "text-slate-500",
    bg: "bg-slate-50",
  },
};

// ---------------------------------------------------------------- INSIGHTS

export type FamiInsightCard = {
  id: string;
  kind: "strength" | "weakness" | "opportunity" | "risk" | "neutral";
  title: string;
  description: string;
};

export function interpretSnapshot(snapshot: FamiSnapshot | null): {
  summary: string;
  cards: FamiInsightCard[];
  topAxis: AxisImpactRow | null;
  bottomAxis: AxisImpactRow | null;
  criticalAxes: AxisImpactRow[];
  advancedAxes: AxisImpactRow[];
} {
  if (!snapshot || !snapshot.global) {
    return {
      summary:
        "Ainda não há um processamento FAMI disponível para este formulário e organização.",
      cards: [],
      topAxis: null,
      bottomAxis: null,
      criticalAxes: [],
      advancedAxes: [],
    };
  }
  const ranked = rankAxesByImpact(snapshot.axes);
  const byPercentageDesc = [...ranked].sort((a, b) => b.percentage - a.percentage);
  const topAxis = byPercentageDesc[0] ?? null;
  const bottomAxis = byPercentageDesc[byPercentageDesc.length - 1] ?? null;
  const criticalAxes = ranked.filter((r) => r.isCritical);
  const advancedAxes = ranked.filter((r) => r.isAdvanced);

  const meta = levelMeta(snapshot.global.maturityLevel);
  const summaryParts: string[] = [
    `Sua maturidade atual é de ${snapshot.global.percentage.toFixed(1)}% (${meta.shortLabel}).`,
  ];
  if (topAxis) {
    summaryParts.push(
      `Maior desempenho em ${topAxis.axisName} (${topAxis.percentage.toFixed(1)}%).`,
    );
  }
  if (bottomAxis && bottomAxis !== topAxis) {
    summaryParts.push(
      `Menor desempenho em ${bottomAxis.axisName} (${bottomAxis.percentage.toFixed(1)}%).`,
    );
  }
  const goal = levelGoal(snapshot.global.percentage);
  if (goal.next) {
    summaryParts.push(goal.message);
  }
  const summary = summaryParts.join(" ");

  const cards: FamiInsightCard[] = [];
  if (topAxis) {
    cards.push({
      id: "strength",
      kind: "strength",
      title: `Ponto forte · ${topAxis.axisName}`,
      description: `Eixo com melhor desempenho (${topAxis.percentage.toFixed(1)}%, ${LEVEL_META[topAxis.level].shortLabel}). Mantenha as práticas e evidências.`,
    });
  }
  if (bottomAxis && bottomAxis !== topAxis) {
    cards.push({
      id: "weakness",
      kind: "weakness",
      title: `Ponto crítico · ${bottomAxis.axisName}`,
      description: `Menor desempenho (${bottomAxis.percentage.toFixed(1)}%). Priorize ações para elevar o eixo ao próximo nível.`,
    });
  }
  const topImpact = ranked[0];
  if (topImpact && topImpact.impact > 0) {
    cards.push({
      id: "opportunity",
      kind: "opportunity",
      title: `Oportunidade · ${topImpact.axisName}`,
      description: `Resolver as recomendações deste eixo pode elevar sua pontuação em até ${topImpact.impact.toFixed(1)} p.p.`,
    });
  }
  if (criticalAxes.length >= 2) {
    cards.push({
      id: "risk",
      kind: "risk",
      title: `Risco institucional · ${criticalAxes.length} eixos críticos`,
      description: `Há ${criticalAxes.length} eixos abaixo de 50%. A consolidação desses eixos é prioridade no próximo ciclo.`,
    });
  }
  if (advancedAxes.length === ranked.length && ranked.length > 0) {
    cards.push({
      id: "all-advanced",
      kind: "strength",
      title: "Todos os eixos em estágio avançado",
      description:
        "Todos os eixos estão em 75% ou mais. Avalie consolidar a maturidade para Nível 5.",
    });
  }
  if (cards.length === 0) {
    cards.push({
      id: "neutral",
      kind: "neutral",
      title: "Ainda há poucos dados para interpretar",
      description:
        "Adicione respostas e evidências para que o FAMI possa gerar análises mais precisas.",
    });
  }

  return { summary, cards, topAxis, bottomAxis, criticalAxes, advancedAxes };
}

// ---------------------------------------------------------------- METAS PARA UI

export const DEFAULT_GOAL_PERCENTAGE = 75; // Nivel 4

export type GoalProgress = {
  target: number;
  pct: number;
  /** Distancia para a meta em p.p. */
  distance: number;
  achieved: boolean;
};

export function goalProgress(
  percentage: number,
  target: number = DEFAULT_GOAL_PERCENTAGE,
): GoalProgress {
  const distance = Math.round((target - percentage) * 10) / 10;
  return {
    target,
    pct: percentage,
    distance,
    achieved: percentage >= target,
  };
}
