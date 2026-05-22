"use client";

import { useMemo } from "react";
import { WorkflowKanbanBoard } from "@/components/ui/workflow-kanban-board";
import {
  RESPONDENT_ACTION_PLAN_COLUMN_ACCENT,
  RESPONDENT_ACTION_PLAN_KANBAN_ORDER,
} from "@/lib/recommendations/kanban-column-accents";
import {
  STATUS_META,
  summarize,
  type ActionPlanView,
  type RespondentActionPlanItem,
} from "@/lib/action-plans/respondent-presentation";
import { RespondentActionPlanCard } from "./respondent-action-plan-card";

type Props = {
  items: RespondentActionPlanItem[];
  /** Exibe totais no rodapé do painel Kanban. */
  showFooter?: boolean;
};

export function RespondentActionPlanBoard({ items, showFooter = true }: Props) {
  const summary = useMemo(() => summarize(items), [items]);

  const columns = useMemo(() => {
    const map = new Map<ActionPlanView, RespondentActionPlanItem[]>();
    for (const item of items) {
      const arr = map.get(item.view) ?? [];
      arr.push(item);
      map.set(item.view, arr);
    }

    return RESPONDENT_ACTION_PLAN_KANBAN_ORDER.map((view) => {
      const meta = STATUS_META[view];
      return {
        id: view,
        label: meta.label,
        description: meta.description,
        accentClass: RESPONDENT_ACTION_PLAN_COLUMN_ACCENT[view],
        items: map.get(view) ?? [],
      };
    });
  }, [items]);

  const hasAny = columns.some((c) => c.items.length > 0);
  if (!hasAny) return null;

  const footer = showFooter ? (
    <>
      <span>
        {summary.inProgress} em andamento · {summary.overdue} atrasadas · {summary.completed}{" "}
        concluídas
      </span>
      <span className="text-slate-400">Role horizontalmente para ver todas as colunas</span>
    </>
  ) : undefined;

  return (
    <WorkflowKanbanBoard
      columns={columns}
      showEmptyColumns
      emptyColumnMessage="Nenhuma ação nesta coluna"
      getItemKey={(item) => item.rowKey}
      renderCard={(item) => <RespondentActionPlanCard item={item} />}
      footer={footer}
    />
  );
}
