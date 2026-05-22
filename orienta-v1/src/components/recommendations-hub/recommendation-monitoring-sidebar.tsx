"use client";

import { CalendarClock } from "lucide-react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";

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
};

/** Sidebar compacta — aba Monitoramento (sem competir com o feed). */
export function RecommendationMonitoringSidebar({ progress, metrics }: Props) {
  return (
    <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
      <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Resumo
        </p>
        <div className="mt-3">
          <RespondentRecommendationProgress value={progress} size="sm" label="Progresso" />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <dt className="text-[10px] text-slate-500">Ativas</dt>
            <dd className="text-lg font-semibold tabular-nums text-slate-900">
              {metrics.active}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <dt className="text-[10px] text-slate-500">Concl.</dt>
            <dd className="text-lg font-semibold tabular-nums text-emerald-700">
              {metrics.completed}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <dt className="text-[10px] text-slate-500">Atraso</dt>
            <dd className="text-lg font-semibold tabular-nums text-rose-700">
              {metrics.overdue}
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-2">
            <dt className="text-[10px] text-slate-500">S/ resp.</dt>
            <dd className="text-lg font-semibold tabular-nums text-amber-700">
              {metrics.noResp}
            </dd>
          </div>
        </dl>
      </div>

      {metrics.upcoming.length > 0 ? (
        <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Próx. 7 dias
          </p>
          <ul className="space-y-2">
            {metrics.upcoming.slice(0, 3).map((p) => (
              <li key={p.id} className="text-xs leading-snug text-slate-700">
                <span className="line-clamp-2 font-medium">{p.actionText}</span>
                <span className="tabular-nums text-slate-500">
                  {p.dueDate?.slice(0, 10) ?? "—"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {metrics.noResp > 0 ? (
        <p className={`${formSurface.messageWarning} text-xs`}>
          {metrics.noResp} sem responsável — ajuste na aba Ações.
        </p>
      ) : null}
    </aside>
  );
}
