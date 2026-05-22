"use client";

import { useMemo } from "react";
import { WorkflowKanbanBoard } from "@/components/ui/workflow-kanban-board";
import { ActionPlanKanbanCard } from "@/components/action-plans/action-plan-kanban-card";
import {
  ADMIN_ACTION_PLAN_COLUMN_ACCENT,
  ADMIN_ACTION_PLAN_KANBAN_ORDER,
} from "@/lib/recommendations/kanban-column-accents";
import {
  STATUS_META,
  summarize,
  type AdminPlanItem,
  type AdminPlanView,
} from "@/lib/action-plans/admin-monitoring";

type Props = {
  items: AdminPlanItem[];
};

export function AdminActionPlanStatusView({ items }: Props) {
  const summary = useMemo(() => summarize(items), [items]);

  const columns = useMemo(() => {
    const map = new Map<AdminPlanView, AdminPlanItem[]>();
    for (const item of items) {
      const arr = map.get(item.view) ?? [];
      arr.push(item);
      map.set(item.view, arr);
    }

    return ADMIN_ACTION_PLAN_KANBAN_ORDER.map((view) => {
      const meta = STATUS_META[view];
      return {
        id: view,
        label: meta.label,
        description: meta.description,
        accentClass: ADMIN_ACTION_PLAN_COLUMN_ACCENT[view],
        items: map.get(view) ?? [],
      };
    });
  }, [items]);

  const hasAny = columns.some((c) => c.items.length > 0);
  if (!hasAny) return null;

  const footer = (
    <>
      <span>
        {summary.inProgress} em andamento · {summary.overdue} atrasadas/críticas ·{" "}
        {summary.completed} concluídas
      </span>
      <span className="text-slate-400">Role horizontalmente para ver todas as colunas</span>
    </>
  );

  return (
    <WorkflowKanbanBoard
      columns={columns}
      showEmptyColumns={false}
      emptyColumnMessage="Nenhuma linha nesta coluna"
      getItemKey={(item) => item.rowKey}
      renderCard={(item) => <ActionPlanKanbanCard variant="staff" item={item} />}
      footer={footer}
    />
  );
}
