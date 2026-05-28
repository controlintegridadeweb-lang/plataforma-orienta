"use client";

import { CalendarClock } from "lucide-react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { statusPillBase } from "@/components/ui/status-pill";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import type { RespondentRecommendationView } from "@/lib/domain/workflow-status-keys";

type Metrics = {
  completed: number;
  active: number;
  overdue: number;
  noResp: number;
  upcoming: ActionPlanAction[];
};

type Props = {
  progress: number;
  metrics: Metrics;
  viewLabel?: string;
  view?: RespondentRecommendationView;
};

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-slate-100/90 bg-white px-3 py-2 shadow-sm">
      <span className="text-2xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <span className={`text-lg font-medium tabular-nums leading-none text-slate-900`}>
        {value}
      </span>
    </div>
  );
}

export function RecommendationMonitoringSnapshot({
  progress,
  metrics,
  viewLabel,
  view,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-sm font-medium text-slate-900">Situação atual</p>
          {view && viewLabel ? (
            <div className="flex flex-wrap items-center gap-2">
              <RespondentRecommendationStatusBadge view={view} />
              <span className={typography.meta}>{viewLabel}</span>
            </div>
          ) : viewLabel ? (
            <p className={typography.auxiliary}>{viewLabel}</p>
          ) : null}
        </div>
        <div className="w-full max-w-xs sm:shrink-0">
          <div className="mb-1.5 flex items-center justify-between text-micro text-slate-500">
            <span>Progresso geral</span>
            <span className="font-medium tabular-nums text-slate-800">{progress}%</span>
          </div>
          <RespondentRecommendationProgress value={progress} size="sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatPill label="Concluídas" value={metrics.completed} />
        <StatPill label="Em andamento" value={metrics.active} />
        <StatPill label="Atrasadas" value={metrics.overdue} />
        <StatPill label="Sem responsável" value={metrics.noResp} />
      </div>

      {metrics.upcoming.length > 0 ? (
        <div className="rounded-lg border border-slate-100/90 bg-slate-50/40 px-3 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-micro font-medium text-slate-700">
            <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            Próximas entregas (7 dias)
          </p>
          <ul className="space-y-2">
            {metrics.upcoming.slice(0, 5).map((p) => {
              const sla = computeActionSla({ dueDate: p.dueDate, status: p.status });
              return (
                <li
                  key={p.id}
                  className="flex items-start justify-between gap-2 text-caption leading-snug"
                >
                  <span className="min-w-0 font-medium text-slate-800 line-clamp-2">
                    {p.actionText}
                  </span>
                  <span
                    className={`${statusPillBase} shrink-0 ${
                      sla === "overdue"
                        ? formSurface.badge.danger
                        : sla === "due_soon"
                          ? formSurface.badge.warning
                          : formSurface.badge.neutral
                    }`}
                  >
                    {p.dueDate?.slice(0, 10) ?? "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {metrics.noResp > 0 ? (
        <p className={`${formSurface.messageWarning} text-xs`}>
          {metrics.noResp} ação(ões) sem responsável — defina na aba <strong>Ações</strong>.
        </p>
      ) : null}
    </div>
  );
}
