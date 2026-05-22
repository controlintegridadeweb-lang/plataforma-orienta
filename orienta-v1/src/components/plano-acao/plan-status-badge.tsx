"use client";

import type { PlanStatus } from "@/lib/action-plans/schemas";
import { ACTION_PLAN_REGISTRY } from "@/lib/domain/status-registry";
import { formSurface } from "@/lib/form-surface";
import { statusPillBase } from "@/components/ui/status-pill";
import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";

export const PLAN_STATUS_LABELS: Record<PlanStatus, string> = Object.fromEntries(
  (Object.keys(ACTION_PLAN_REGISTRY) as PlanStatus[]).map((k) => [
    k,
    ACTION_PLAN_REGISTRY[k].label,
  ]),
) as Record<PlanStatus, string>;

export function PlanStatusBadge({ status }: { status: PlanStatus }) {
  return (
    <WorkflowStatusBadge domain="action_plan" status={status} presentation="chip" />
  );
}

const SLA_TONE: Record<"ok" | "due_soon" | "overdue", string> = {
  ok: formSurface.badge.success,
  due_soon: formSurface.badge.warning,
  overdue: formSurface.badge.danger,
};

export function SlaBadge({
  label,
}: {
  label: "ok" | "due_soon" | "overdue" | "na";
}) {
  if (label === "na") {
    return (
      <span className={`${statusPillBase} ${formSurface.badge.neutral}`}>
        —
      </span>
    );
  }
  const text = {
    ok: "No prazo",
    due_soon: "Vence em 7 dias",
    overdue: "Atrasado",
  } as const;
  return (
    <span className={`${statusPillBase} ${SLA_TONE[label]}`}>
      {text[label]}
    </span>
  );
}
