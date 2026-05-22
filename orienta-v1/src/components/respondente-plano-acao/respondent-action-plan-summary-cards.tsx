"use client";

import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Circle,
  ListChecks,
  PlayCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard, MetricCardSkeleton, type MetricCardVariant } from "@/components/ui/metric-card";
import type { RespondentActionPlanSummary } from "@/lib/action-plans/respondent-presentation";

export type ActionPlanSummaryKey =
  | "total"
  | "not_started"
  | "in_progress"
  | "completed"
  | "overdue"
  | "due_soon"
  | "no_plan";

type Tone = "slate" | "rose" | "amber" | "sky" | "emerald" | "violet";

function toneToVariant(tone: Tone): MetricCardVariant {
  if (tone === "rose") return "danger";
  if (tone === "amber") return "warning";
  if (tone === "sky") return "info";
  if (tone === "emerald") return "success";
  if (tone === "violet") return "default";
  return "neutral";
}

type CardDef = {
  key: ActionPlanSummaryKey;
  label: string;
  description: string;
  icon: LucideIcon;
  tone: Tone;
  value: (s: RespondentActionPlanSummary) => number;
};

const DEFS: CardDef[] = [
  {
    key: "total",
    label: "Total",
    description: "Ações cadastradas para a sua organização.",
    icon: ListChecks,
    tone: "slate",
    value: (s) => s.total,
  },
  {
    key: "not_started",
    label: "Não iniciadas",
    description: "Plano criado, execução ainda não começou.",
    icon: Circle,
    tone: "violet",
    value: (s) => s.notStarted,
  },
  {
    key: "in_progress",
    label: "Em andamento",
    description: "Execução em curso.",
    icon: PlayCircle,
    tone: "sky",
    value: (s) => s.inProgress,
  },
  {
    key: "completed",
    label: "Concluídas",
    description: "Ações finalizadas com sucesso.",
    icon: CheckCircle2,
    tone: "emerald",
    value: (s) => s.completed,
  },
  {
    key: "overdue",
    label: "Atrasadas",
    description: "Planos com prazo vencido.",
    icon: AlertTriangle,
    tone: "rose",
    value: (s) => s.overdue,
  },
  {
    key: "no_plan",
    label: "Sem plano",
    description: "Recomendações ainda sem linha de ação.",
    icon: Circle,
    tone: "violet",
    value: (s) => s.noPlan,
  },
  {
    key: "due_soon",
    label: "Próximas do prazo",
    description: "Vencem nos próximos 7 dias.",
    icon: CalendarClock,
    tone: "amber",
    value: (s) => s.dueSoon,
  },
];

type Props = {
  summary: RespondentActionPlanSummary | null;
  loading?: boolean;
  activeKey?: ActionPlanSummaryKey | null;
  onSelect: (key: ActionPlanSummaryKey) => void;
};

export function RespondentActionPlanSummaryCards({
  summary,
  loading,
  activeKey,
  onSelect,
}: Props) {
  if (loading && !summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DEFS.map((d) => (
          <MetricCardSkeleton key={d.key} />
        ))}
      </div>
    );
  }

  const total = summary?.total ?? 0;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
