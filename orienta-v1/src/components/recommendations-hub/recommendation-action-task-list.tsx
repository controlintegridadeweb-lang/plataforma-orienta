"use client";

import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { PanelSection } from "@/components/ui/panel-section";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";
import { saveActionPlan, saveRespondentActionPlan } from "@/lib/action-plans/client";
import { RecommendationPlanActionForm } from "./recommendation-plan-action-form";
import { ActionPlanTaskRow } from "./action-plan-task-row";
import { useRecommendationDetailContext } from "./recommendation-detail-context";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

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

export function RecommendationActionTaskList() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const [expandedId, setExpandedId] = useState<string | "new" | null>(null);

  const ordered = useMemo(() => (row ? sortPlans(row.plans) : []), [row]);

  if (!row) return null;

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

  return (
    <div className={layout.panelStack}>
      <PanelSection
        title="Ações"
        description={
          ordered.length === 0
            ? "Cadastre a primeira linha de execução desta recomendação."
            : `${ordered.length} ${ordered.length === 1 ? "tarefa" : "tarefas"} no plano · clique para editar`
        }
        variant="card"
        contentClassName="space-y-3"
        actions={
          <button
            type="button"
            className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1.5`}
            onClick={() => toggle("new")}
            aria-expanded={expandedId === "new"}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Nova ação
          </button>
        }
      >
        {expandedId === "new" ? (
          <div className="rounded-lg border border-brand-200/70 bg-brand-50/20 p-3 sm:p-4">
            <p className="mb-3 text-xs font-medium text-slate-700">Nova tarefa</p>
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
          <p className="rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center text-sm text-slate-500">
            Nenhuma ação cadastrada. Use <strong className="font-medium text-slate-700">Nova ação</strong>{" "}
            para começar.
          </p>
        ) : (
          <ul className="space-y-2">
            {ordered.map((plan) => (
              <li key={plan.id}>
                <ActionPlanTaskRow
                  plan={plan}
                  open={expandedId === plan.id}
                  onToggle={() => toggle(plan.id)}
                >
                  <RecommendationPlanActionForm
                    compact
                    recommendationId={row.recommendationId}
                    formId={row.formId}
                    recommendationText={row.recommendationText}
                    plan={plan}
                    actionCount={row.plans.length}
                    onSave={saveHandler}
                  />
                </ActionPlanTaskRow>
              </li>
            ))}
          </ul>
        )}
      </PanelSection>
    </div>
  );
}
