"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  PlayCircle,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { MetricCard, type MetricCardVariant } from "@/components/ui/metric-card";
import type { AdminRecommendationSummary } from "@/lib/recommendations/admin-presentation";

export type AdminRecommendationSummaryFilter =
  | null
  | "without_plan"
  | "in_execution"
  | "completed"
  | "overdue";

type Props = {
  summary: AdminRecommendationSummary;
  activeFilter: AdminRecommendationSummaryFilter;
  onSelect: (filter: AdminRecommendationSummaryFilter) => void;
};

type CardDef = {
  id: AdminRecommendationSummaryFilter;
  label: string;
  value: number;
  hint: string;
  variant: MetricCardVariant;
  icon: LucideIcon;
  status?: "ok" | "attention" | "critical" | "neutral";
};

export function AdminRecommendationSummaryCards({
  summary,
  activeFilter,
  onSelect,
}: Props) {
  const cards: CardDef[] = [
    {
      id: null,
      label: "Total",
      value: summary.total,
      hint: "Recomendações no escopo atual",
      variant: "neutral",
      icon: ClipboardList,
    },
    {
      id: "without_plan",
      label: "Sem plano",
      value: summary.withoutPlan,
      hint: "Aguardando plano de ação",
      variant: summary.withoutPlan > 0 ? "warning" : "neutral",
      icon: Target,
      status: summary.withoutPlan > 0 ? "attention" : "neutral",
    },
    {
      id: "in_execution",
      label: "Em execução",
      value: summary.inExecution,
      hint: "Planos em andamento",
      variant: "default",
      icon: PlayCircle,
    },
    {
      id: "completed",
      label: "Concluídas",
      value: summary.completed,
      hint: "Tratativas finalizadas",
      variant: "success",
      icon: CheckCircle2,
    },
    {
      id: "overdue",
      label: "Atrasadas",
      value: summary.overdue,
      hint: "Prazo vencido",
      variant: summary.overdue > 0 ? "danger" : "neutral",
      icon: AlertTriangle,
      status: summary.overdue > 0 ? "critical" : "neutral",
    },
  ];

  return (
    <section aria-label="Indicadores do portfólio">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {cards.map((card) => {
          const active = activeFilter === card.id;
          return (
            <MetricCard
              key={String(card.id ?? "total")}
              density="compact"
              variant={card.variant}
              label={card.label}
              value={card.value}
              icon={card.icon}
              status={card.status ?? "neutral"}
              htmlTitle={card.hint}
              onClick={() => onSelect(active ? null : card.id)}
              aria-pressed={active}
              className={active ? "ring-2 ring-brand-300/80 ring-offset-1" : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
