"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Flame,
  Layers,
  Minus,
  Shield,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  TREND_META,
  levelMeta,
  type EvolutionDelta,
} from "@/lib/fami/respondent-presentation";
import { MetricCard, type MetricCardVariant } from "@/components/ui/metric-card";

export type FamiSummaryFilter =
  | null
  | "critical"
  | "advanced"
  | "evidences-pending"
  | "recommendations-open";

type Props = {
  percentage: number | null;
  level: number | null;
  criticalAxes: number;
  advancedAxes: number;
  evidencesPending: number;
  recommendationsOpen: number;
  delta: EvolutionDelta;
  sparkline?: number[];
  activeFilter: FamiSummaryFilter;
  onSelect: (filter: FamiSummaryFilter) => void;
};

type Card = {
  id: string;
  label: string;
  description: string;
  value: string;
  icon: LucideIcon;
  variant: MetricCardVariant;
  iconContainerClassName?: string;
  iconClassName?: string;
  filter: FamiSummaryFilter;
};

function Sparkline({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(100, ...values);
  const w = 60;
  const h = 18;
  const xs = values.map((_, i) => (i / (values.length - 1)) * w);
  const ys = values.map((v) => h - (v / max) * h);
  const d = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${ys[i]!.toFixed(1)}`).join(" ");
  return (
    <svg width={w} height={h} aria-hidden className="opacity-80">
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DeltaPill({ delta }: { delta: EvolutionDelta }) {
  if (delta.delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-500">
        <Minus className="h-3 w-3" aria-hidden /> Sem histórico
      </span>
    );
  }
  if (delta.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-2xs font-semibold text-emerald-700">
        <ArrowUpRight className="h-3 w-3" aria-hidden />+{delta.delta.toFixed(1)} p.p.
      </span>
    );
  }
  if (delta.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-2xs font-semibold text-rose-700">
        <ArrowDownRight className="h-3 w-3" aria-hidden />
        {delta.delta.toFixed(1)} p.p.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-2xs font-semibold text-slate-600">
      <Minus className="h-3 w-3" aria-hidden /> Estável
    </span>
  );
}

export function RespondentFamiSummaryCards({
  percentage,
  level,
  criticalAxes,
  advancedAxes,
  evidencesPending,
  recommendationsOpen,
  delta,
  sparkline = [],
  activeFilter,
  onSelect,
}: Props) {
  const lvl = levelMeta(level ?? 1);
  const trend = TREND_META[delta.trend];
  const TrendIcon = trend.icon;
  const sparkColor =
    delta.trend === "down" ? "#dc2626" : delta.trend === "up" ? "#059669" : "#475569";

  const cards: Card[] = [
    {
      id: "score",
      label: "Pontuação",
      description: "Geral do diagnóstico",
      value: percentage != null ? `${percentage.toFixed(1)}%` : "—",
      icon: Trophy,
      variant: "default",
      filter: null,
    },
    {
      id: "level",
      label: "Nível FAMI",
      description: lvl.shortLabel,
      value: level != null ? `N${level}` : "—",
      icon: lvl.icon,
      variant: "neutral",
      iconContainerClassName: `${lvl.iconBg} ring-0`,
      iconClassName: lvl.iconColor,
      filter: null,
    },
    {
      id: "critical",
      label: "Eixos críticos",
      description: "Abaixo de 50%",
      value: String(criticalAxes),
      icon: Flame,
      variant: "danger",
      filter: "critical",
    },
    {
      id: "advanced",
      label: "Eixos avançados",
      description: "≥ 75%",
      value: String(advancedAxes),
      icon: ShieldCheck,
      variant: "success",
      filter: "advanced",
    },
    {
      id: "evidences",
      label: "Evidências pendentes",
      description: "Aguardando validação",
      value: String(evidencesPending),
      icon: Shield,
      variant: "warning",
      filter: "evidences-pending",
    },
    {
      id: "recommendations",
      label: "Recomendações abertas",
      description: "Sem plano ou em execução",
      value: String(recommendationsOpen),
      icon: ClipboardList,
      variant: "default",
      iconContainerClassName: "bg-indigo-500/10 ring-1 ring-indigo-500/10",
      iconClassName: "text-indigo-700",
      filter: "recommendations-open",
    },
    {
      id: "evolution",
      label: "Evolução",
      description:
        delta.previousPercentage != null
          ? `vs versão anterior (${delta.previousPercentage.toFixed(1)}%)`
          : "Necessita 2+ versões",
      value:
        delta.delta != null
          ? `${delta.delta > 0 ? "+" : ""}${delta.delta.toFixed(1)} p.p.`
          : "—",
      icon: Sparkles,
      variant: "neutral",
      iconContainerClassName: `${trend.bg} ring-0`,
      iconClassName: trend.color,
      filter: null,
    },
  ];

  return (
    <section
      aria-label="Resumo executivo da maturidade"
      className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
    >
      {cards.map((card) => {
        const active = activeFilter === card.filter && card.filter !== null;
        const isClickable = card.filter !== null;
        const Icon = card.icon;
        const secondaryNode =
          card.id === "evolution" ? (
            <span className="flex items-start justify-between gap-2">
              <span className="line-clamp-2 min-w-0">{card.description}</span>
              <TrendIcon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${trend.color}`} aria-hidden />
            </span>
          ) : (
            card.description
          );

        const children =
          card.id === "score" ? (
            <Sparkline values={sparkline} color={sparkColor} />
          ) : card.id === "evolution" ? (
            <DeltaPill delta={delta} />
          ) : card.id === "level" ? (
            <span className={`inline-block rounded-full px-2 py-0.5 text-2xs font-semibold ${lvl.badgeClasses}`}>
              {lvl.shortLabel}
            </span>
          ) : card.id === "critical" || card.id === "advanced" ? (
            <span className="inline-flex items-center gap-1 text-2xs text-slate-500">
              <Layers className="h-3 w-3" aria-hidden />
              {card.id === "critical" ? "Priorize estes eixos" : "Mantenha o nível"}
            </span>
          ) : null;

        const common = {
          variant: card.variant,
          label: card.label,
          value: card.value,
          secondary: secondaryNode,
          icon: Icon,
          density: "compact" as const,
          iconContainerClassName: card.iconContainerClassName,
          iconClassName: card.iconClassName,
          children,
          className: active ? "ring-2 ring-brand-300 border-brand-400/70" : "",
        };

        if (isClickable) {
          return (
            <MetricCard
              key={card.id}
              {...common}
              onClick={() => onSelect(card.filter)}
              aria-pressed={active}
            />
          );
        }

        return <MetricCard key={card.id} {...common} />;
      })}
    </section>
  );
}
