"use client";

import { MetricCard, type MetricCardVariant } from "@/components/ui/metric-card";
import type { AdminPlanSummary } from "@/lib/action-plans/admin-monitoring";

export type AdminPlanSummaryFilter = null | "in_progress" | "completed" | "overdue";

type Props = {
  summary: AdminPlanSummary;
  activeFilter: AdminPlanSummaryFilter;
  onSelect: (filter: AdminPlanSummaryFilter) => void;
};

type CardDef = {
  id: AdminPlanSummaryFilter;
  label: string;
  value: number;
  hint: string;
  variant: MetricCardVariant;
};

export function AdminActionPlanSummaryCards({
  summary,
  activeFilter,
  onSelect,
}: Props) {
  const cards: CardDef[] = [
    {
      id: null,
      label: "Total no escopo",
      value: summary.total,
      hint: "Todas as ações visíveis com os filtros atuais",
      variant: "neutral",
    },
    {
      id: "in_progress",
      label: "Em andamento",
      value: summary.inProgress,
      hint: "Ações com plano em execução",
      variant: "default",
    },
    {
      id: "completed",
      label: "Concluídos",
      value: summary.completed,
      hint: "Ações finalizadas",
      variant: "success",
    },
    {
      id: "overdue",
      label: "Atrasados",
      value: summary.overdue,
      hint: "Prazo vencido ou status crítico",
      variant: summary.overdue > 0 ? "danger" : "neutral",
    },
  ];

  return (
    <section aria-label="Indicadores do plano de ação">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const active = activeFilter === card.id;
          return (
            <MetricCard
              key={String(card.id ?? "total")}
              density="compact"
              variant={card.variant}
              label={card.label}
              value={card.value}
              htmlTitle={card.hint}
              onClick={() => onSelect(active ? null : card.id)}
              aria-pressed={active}
              valueClassName="text-[clamp(1.75rem,3vw,2.25rem)] font-semibold tabular-nums leading-none tracking-tight text-slate-900"
              className={active ? "ring-2 ring-brand-300/80 ring-offset-1" : undefined}
            />
          );
        })}
      </div>
    </section>
  );
}
