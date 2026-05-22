"use client";

import {
  CheckCircle2,
  Hourglass,
  Lightbulb,
  PlayCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard, MetricCardSkeleton, type MetricCardVariant } from "@/components/ui/metric-card";
import type { RespondentRecommendationSummary } from "@/lib/recommendations/respondent-presentation";

export type SummaryCardKey =
  | "total"
  | "in_progress"
  | "resolved"
  | "awaiting_action";

type Tone = "slate" | "rose" | "amber" | "blue" | "sky" | "emerald" | "violet";

function toneToVariant(tone: Tone): MetricCardVariant {
  if (tone === "rose") return "danger";
  if (tone === "amber") return "warning";
  if (tone === "sky") return "info";
  if (tone === "emerald") return "success";
  if (tone === "violet") return "default";
  return "neutral";
}

type CardDef = {
  key: SummaryCardKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  value: (s: RespondentRecommendationSummary) => number;
};

const DEFS: CardDef[] = [
  {
    key: "total",
    label: "Total",
    description: "Recomendações da sua organização.",
    icon: Lightbulb,
    tone: "slate",
    value: (s) => s.total,
  },
  {
    key: "in_progress",
    label: "Em andamento",
    description: "Já têm plano de ação ativo.",
    icon: PlayCircle,
    tone: "sky",
    value: (s) => s.inProgress,
  },
  {
    key: "resolved",
    label: "Concluídas",
    description: "Recomendações finalizadas.",
    icon: CheckCircle2,
    tone: "emerald",
    value: (s) => s.resolved,
  },
  {
    key: "awaiting_action",
    label: "Pendentes de ação",
    description: "Abertas e sem plano cadastrado.",
    icon: Hourglass,
    tone: "violet",
    value: (s) => s.awaitingAction,
  },
];

type Props = {
  summary: RespondentRecommendationSummary | null;
  loading?: boolean;
  activeKey?: SummaryCardKey | null;
  onSelect: (key: SummaryCardKey) => void;
};

export function RespondentRecommendationSummaryCards({
  summary,
  loading,
  activeKey,
  onSelect,
}: Props) {
  if (loading && !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {DEFS.map((d) => (
          <MetricCardSkeleton key={d.key} />
        ))}
      </div>
    );
  }

  const total = summary?.total ?? 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {DEFS.map((d) => {
        const Icon = d.icon;
        const isActive = activeKey === d.key;
        const v = summary ? d.value(summary) : 0;
        const pct = total > 0 && d.key !== "total" ? Math.round((v / total) * 100) : null;
        return (
          <MetricCard
            key={d.key}
            variant={toneToVariant(d.tone)}
            label={d.label}
            value={
              pct != null ? (
                <span className="inline-flex flex-wrap items-baseline gap-2">
                  <span>{v}</span>
                  <span className="text-sm font-medium tabular-nums text-slate-500">{pct}%</span>
                </span>
              ) : (
                v
              )
            }
            valueClassName={
              pct != null
                ? "mt-2 text-2xl font-semibold tabular-nums leading-none text-slate-900"
                : undefined
            }
            secondary={d.description}
            icon={Icon}
            density="compact"
            onClick={() => onSelect(d.key)}
            aria-pressed={isActive}
            className={isActive ? "ring-2 ring-brand-300 border-brand-400/70" : ""}
          />
        );
      })}
    </div>
  );
}
