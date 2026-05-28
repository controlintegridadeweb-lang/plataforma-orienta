"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import { computeActionSla } from "@/lib/domain/action-plans";
import { PlanStatusBadge } from "@/components/plano-acao/plan-status-badge";
import { statusPillBase } from "@/components/ui/status-pill";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

function formatDueDate(value: string | null | undefined): string {
  if (!value) return "Sem prazo";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
    });
  } catch {
    return value;
  }
}

type Props = {
  plan: ActionPlanAction;
  open: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
};

export function ActionPlanTaskRow({ plan, open, onToggle, children }: Props) {
  const sla = computeActionSla({ dueDate: plan.dueDate, status: plan.status });
  const overdue = sla === "overdue";
  const soon = sla === "due_soon";

  return (
    <article
      className={`overflow-hidden rounded-lg border bg-white transition ${
        open
          ? "border-brand-200/80 shadow-card ring-1 ring-brand-100/60"
          : overdue
            ? "border-rose-200/80 hover:border-rose-300"
            : "border-slate-200/90 hover:border-slate-300 hover:shadow-sm"
      }`}
    >
      <button
        type="button"
        className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left sm:px-3.5"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="mt-0.5 shrink-0 text-slate-400">
          {open ? (
            <ChevronDown className="h-4 w-4" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4" aria-hidden />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-caption font-medium leading-snug text-slate-900">
            {plan.actionText}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <PlanStatusBadge status={plan.status} />
            <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
              {formatDueDate(plan.dueDate)}
            </span>
            {plan.responsibleName?.trim() ? (
              <span className={`${typography.meta} truncate max-w-40`}>
                {plan.responsibleName}
              </span>
            ) : (
              <span className={`${statusPillBase} ${formSurface.badge.muted}`}>Sem respons�vel</span>
            )}
            {overdue ? (
              <span className={`${statusPillBase} ${formSurface.badge.danger}`}>Atrasada</span>
            ) : soon ? (
              <span className={`${statusPillBase} ${formSurface.badge.warning}`}>= 7 dias</span>
            ) : null}
          </div>
        </div>
      </button>
      {open && children ? (
        <div className="border-t border-slate-100 bg-slate-50/30 px-3 py-3 sm:px-3.5">{children}</div>
      ) : null}
    </article>
  );
}
