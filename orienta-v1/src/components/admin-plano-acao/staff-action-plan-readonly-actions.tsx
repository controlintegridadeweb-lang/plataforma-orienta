"use client";

import { useMemo, useState } from "react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { PlanStatusBadge } from "@/components/plano-acao/plan-status-badge";
import { progressFromPlan } from "@/lib/recommendations/admin-presentation";
import { AdminActionPlanProgress } from "./admin-action-plan-progress";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

type Props = {
  plans: ActionPlanAction[];
};

/** Visão somente leitura das ações — supervisão, sem edição operacional. */
export function StaffActionPlanReadonlyActions({ plans }: Props) {
  const ordered = useMemo(
    () =>
      [...plans].sort((a, b) => (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31")),
    [plans],
  );

  if (ordered.length === 0) {
    return (
      <p className={`rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center ${typography.auxiliary}`}>
        A organização ainda não cadastrou linhas de execução nesta recomendação.
      </p>
    );
  }

  return (
    <div className={formSurface.table.wrapper}>
      <table className={`${formSurface.table.table} min-w-[640px]`}>
        <thead className={formSurface.table.head}>
          <tr>
            <th className={formSurface.table.headCell}>Ação</th>
            <th className={formSurface.table.headCell}>Responsável</th>
            <th className={formSurface.table.headCell}>Prazo</th>
            <th className={formSurface.table.headCell}>Status</th>
            <th className={formSurface.table.headCell}>Progresso</th>
            <th className={formSurface.table.headCell}>Atualização</th>
          </tr>
        </thead>
        <tbody className={formSurface.table.body}>
          {ordered.map((plan, index) => {
            const sla = computeActionSla({ dueDate: plan.dueDate, status: plan.status });
            const progress = progressFromPlan(plan);
            return (
              <tr
                key={plan.id}
                className={`${formSurface.table.row} ${index % 2 === 0 ? "bg-white" : "bg-slate-50/50"}`}
              >
                <td className={`${formSurface.table.cell} min-w-[12rem] max-w-xs`}>
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">{plan.actionText}</p>
                  {plan.observations?.trim() ? (
                    <p className={`mt-1 line-clamp-2 ${typography.meta}`}>{plan.observations}</p>
                  ) : null}
                </td>
                <td className={formSurface.table.cell}>
                  <p className="text-sm text-slate-800">{plan.responsibleName || "—"}</p>
                  {plan.responsibleSector ? (
                    <p className={typography.meta}>{plan.responsibleSector}</p>
                  ) : null}
                </td>
                <td className={formSurface.table.cell}>
                  <span
                    className={
                      sla === "overdue"
                        ? "font-semibold text-rose-700"
                        : sla === "due_soon"
                          ? "font-medium text-amber-800"
                          : "text-slate-700"
                    }
                  >
                    {formatDate(plan.dueDate)}
                  </span>
                </td>
                <td className={formSurface.table.cell}>
                  <PlanStatusBadge status={plan.status} />
                </td>
                <td className={`${formSurface.table.cell} min-w-[7rem]`}>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-xs tabular-nums text-slate-600">{progress}%</span>
                    <AdminActionPlanProgress value={progress} overdue={sla === "overdue"} size="xs" showLabel={false} />
                  </div>
                </td>
                <td className={`${formSurface.table.cell} text-xs text-slate-500`}>
                  {formatDate(plan.updatedAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
