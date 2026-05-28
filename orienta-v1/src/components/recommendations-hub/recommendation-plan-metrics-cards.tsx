"use client";

import { useMemo } from "react";
import { AlertTriangle, CalendarClock, ListChecks, TrendingUp } from "lucide-react";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { computeActionSla } from "@/lib/domain/action-plans";
import { MetricCard } from "@/components/ui/metric-card";
import { layout, typography } from "@/lib/layout/design-system";

export type PlanMetricsInput = {
  id: string;
  actionText: string;
  dueDate: string | null | undefined;
  status: PlanStatus;
};

function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return iso;
  }
}

type Props = {
  progress: number;
  plans: PlanMetricsInput[];
};

/** KPIs do plano de ação (workspace / monitoramento) — mesmo padrão dos indicadores do módulo. */
export function RecommendationPlanMetricsCards({ progress, plans }: Props) {
  const { overdue, upcoming } = useMemo(() => {
    let overdueCount = 0;
    const upcomingList: PlanMetricsInput[] = [];

    for (const p of plans) {
      if (p.status === "completed" || p.status === "cancelled") continue;
      if (
        computeActionSla({
          dueDate: p.dueDate ?? "",
          status: p.status,
        }) === "overdue"
      ) {
        overdueCount += 1;
      }
    }

    for (const p of plans) {
      if (p.status === "completed" || p.status === "cancelled") continue;
      if (p.dueDate?.trim()) upcomingList.push(p);
    }
    upcomingList.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));

    return {
      overdue: overdueCount,
      upcoming: upcomingList.slice(0, 3),
    };
  }, [plans]);

  return (
    <div className={layout.kpiGrid4}>
      <MetricCard
        variant="default"
        density="compact"
        label="Progresso"
        value={`${progress}%`}
        secondary="Média das ações desta recomendação"
        icon={TrendingUp}
      />
      <MetricCard
        variant="neutral"
        density="compact"
        label="Ações"
        value={plans.length}
        secondary={plans.length === 1 ? "Linha cadastrada" : "Linhas cadastradas"}
        icon={ListChecks}
      />
      <MetricCard
        variant="danger"
        density="compact"
        label="Atrasadas"
        value={overdue}
        secondary={overdue === 0 ? "Nenhuma ação em atraso" : "Exigem atenção imediata"}
        icon={AlertTriangle}
        status={overdue > 0 ? "critical" : "ok"}
      />
      <MetricCard
        variant="warning"
        density="compact"
        label="Próximos vencimentos"
        value={upcoming.length > 0 ? upcoming.length : "—"}
        secondary={
          upcoming.length === 0 ? "Sem prazos futuros cadastrados" : "Próximas na fila"
        }
        icon={CalendarClock}
        status={upcoming.length > 0 ? "attention" : "neutral"}
      >
        {upcoming.length > 0 ? (
          <ul className={`mt-3 space-y-1.5 border-t border-slate-100 pt-3 ${typography.meta}`}>
            {upcoming.map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-slate-700">
                <span className="min-w-0 truncate font-medium">{p.actionText}</span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {formatShortDate(p.dueDate)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </MetricCard>
    </div>
  );
}
