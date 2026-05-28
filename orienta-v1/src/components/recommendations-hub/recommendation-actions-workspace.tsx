"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { PlanStatusBadge } from "@/components/plano-acao/plan-status-badge";
import { statusPillBase } from "@/components/ui/status-pill";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { progressFromPlans } from "@/lib/recommendations/respondent-presentation";
import { saveActionPlan, saveRespondentActionPlan } from "@/lib/action-plans/client";
import { invalidateRespondentOverviewCache } from "@/lib/hooks/respondent-overview-cache";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";
import { RecommendationPlanActionForm } from "./recommendation-plan-action-form";
import { useRecommendationDetailContext } from "./recommendation-detail-context";
import { RecommendationSuggestedActionsPanel } from "./recommendation-suggested-actions-panel";

function sortPlans(plans: ActionPlanAction[]): ActionPlanAction[] {
  return [...plans].sort((a, b) => {
    const sa = computeActionSla({ dueDate: a.dueDate, status: a.status });
    const sb = computeActionSla({ dueDate: b.dueDate, status: b.status });
    const aOver = sa === "overdue";
    const bOver = sb === "overdue";
    if (aOver !== bOver) return aOver ? -1 : 1;
    return (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
  });
}

function formatDueShort(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  } catch {
    return "";
  }
}

/** Workspace operacional  aba Ações. */
export function RecommendationActionsWorkspace() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const [expandedId, setExpandedId] = useState<string | "new" | null>(null);

  const ordered = useMemo(() => (row ? sortPlans(row.plans) : []), [row]);

  if (!row) return null;

  const progress = progressFromPlans(ordered);
  const overdue = ordered.filter(
    (p) =>
      p.status !== "completed" &&
      p.status !== "cancelled" &&
      computeActionSla({ dueDate: p.dueDate, status: p.status }) === "overdue",
  ).length;
  const active = ordered.filter(
    (p) => p.status !== "completed" && p.status !== "cancelled",
  ).length;
  const completed = ordered.filter((p) => p.status === "completed").length;

  function toggle(id: string | "new") {
    setExpandedId((cur) => (cur === id ? null : id));
  }

  const saveHandler =
    ctx.role === "respondent"
      ? async (payload: Parameters<typeof saveRespondentActionPlan>[0]) => {
          await saveRespondentActionPlan(payload);
          await ctx.refetch();
        }
      : async (payload: Parameters<typeof saveActionPlan>[0]) => {
          await saveActionPlan(payload);
          await ctx.refetch();
        };

  async function afterSuggestionsApplied() {
    await ctx.refetch();
    if (ctx.role === "respondent") invalidateRespondentOverviewCache();
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Barra operacional */}
      <div className="flex flex-col gap-4 rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap gap-4 sm:gap-6">
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-slate-500">
              Tarefas
            </p>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">{ordered.length}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-slate-500">
              Em andamento
            </p>
            <p className="text-2xl font-semibold tabular-nums text-sky-700">{active}</p>
          </div>
          <div>
            <p className="text-2xs font-semibold uppercase tracking-wide text-slate-500">
              Concluídas
            </p>
            <p className="text-2xl font-semibold tabular-nums text-emerald-700">{completed}</p>
          </div>
          {overdue > 0 ? (
            <div>
              <p className="text-2xs font-semibold uppercase tracking-wide text-rose-600">
                Atrasadas
              </p>
              <p className="text-2xl font-semibold tabular-nums text-rose-700">{overdue}</p>
            </div>
          ) : null}
        </div>
        <div className="w-full max-w-48 sm:shrink-0">
          <RespondentRecommendationProgress value={progress} size="sm" label="Progresso do plano" />
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className={`${typography.meta} max-w-xl`}>
          Gerencie prazos, responsáveis e status. Clique em uma linha para editar rapidamente.
        </p>
        <button
          type="button"
          className={`${formSurface.primaryButton} inline-flex w-full items-center justify-center gap-2 sm:w-auto`}
          onClick={() => toggle("new")}
          aria-expanded={expandedId === "new"}
        >
          <Plus className="h-4 w-4" aria-hidden />
          Nova ação
        </button>
      </div>

      {ctx.role === "respondent" ? (
        <RecommendationSuggestedActionsPanel
          recommendationId={row.recommendationId}
          onApplied={afterSuggestionsApplied}
        />
      ) : null}

      {expandedId === "new" ? (
        <div className="rounded-xl border-2 border-brand-200/70 bg-brand-50/25 p-4 sm:p-5">
          <p className="mb-3 text-sm font-semibold text-slate-900">Cadastrar nova tarefa</p>
          <RecommendationPlanActionForm
            compact
            recommendationId={row.recommendationId}
            formId={row.formId}
            recommendationText={row.recommendationText}
            plan={null}
            actionCount={row.plans.length}
            onSave={async (payload) => {
              await saveHandler(payload);
              setExpandedId(null);
            }}
            submitLabel="Cadastrar"
          />
        </div>
      ) : null}

      {ordered.length === 0 && expandedId !== "new" ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-800">Nenhuma ação cadastrada</p>
          <p className={`mt-1 ${typography.meta}`}>
            Use <strong>Nova ação</strong> ou aplique as sugestões do formulário para começar.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm">
          <div className="hidden border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-2xs font-semibold uppercase tracking-wide text-slate-500 sm:grid sm:grid-cols-[1fr_6.5rem_5.5rem_7rem_2.5rem] sm:gap-3">
            <span>Tarefa</span>
            <span>Status</span>
            <span>Prazo</span>
            <span>Responsável</span>
            <span className="sr-only">Expandir</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {ordered.map((plan) => {
              const sla = computeActionSla({ dueDate: plan.dueDate, status: plan.status });
              const isOpen = expandedId === plan.id;
              return (
                <li key={plan.id}>
                  <div
                    className={`sm:grid sm:grid-cols-[1fr_6.5rem_5.5rem_7rem_2.5rem] sm:items-center sm:gap-3 sm:px-4 sm:py-3 ${isOpen ? "bg-brand-50/20" : "hover:bg-slate-50/60"}`}
                  >
                    <button
                      type="button"
                      className="flex w-full min-w-0 items-start gap-2 px-4 py-3 text-left sm:contents sm:p-0"
                      onClick={() => toggle(plan.id)}
                      aria-expanded={isOpen}
                    >
                      <span className="min-w-0 flex-1 sm:col-span-1">
                        <span className="line-clamp-2 text-sm font-medium text-slate-900">
                          {plan.actionText}
                        </span>
                      </span>
                      <span className="mt-2 flex flex-wrap items-center gap-1.5 sm:mt-0">
                        <PlanStatusBadge status={plan.status} />
                      </span>
                      <span
                        className={`mt-1 text-xs tabular-nums sm:mt-0 ${
                          sla === "overdue" ? "font-medium text-rose-700" : "text-slate-600"
                        }`}
                      >
                        {formatDueShort(plan.dueDate)}
                      </span>
                      <span className={`mt-1 truncate text-xs text-slate-600 sm:mt-0`}>
                        {plan.responsibleName?.trim() || (
                          <span className={`${statusPillBase} ${formSurface.badge.muted}`}>
                            
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                  {isOpen ? (
                    <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-4 sm:px-5">
                      <RecommendationPlanActionForm
                        compact
                        recommendationId={row.recommendationId}
                        formId={row.formId}
                        recommendationText={row.recommendationText}
                        plan={plan}
                        actionCount={row.plans.length}
                        onSave={saveHandler}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
