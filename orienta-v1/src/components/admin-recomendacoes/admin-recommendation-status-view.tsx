"use client";

import { useMemo } from "react";
import { usePathname } from "next/navigation";
import { WorkflowKanbanBoard } from "@/components/ui/workflow-kanban-board";
import { ADMIN_RECOMMENDATION_COLUMN_ACCENT } from "@/lib/recommendations/kanban-column-accents";
import {
  ADMIN_RECOMMENDATION_KANBAN_ORDER,
  STATUS_META,
  summarize,
  type AdminRecommendationItem,
  type AdminRecommendationView,
} from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationCard } from "./admin-recommendation-card";

type Props = {
  items: AdminRecommendationItem[];
};

export function AdminRecommendationStatusView({ items }: Props) {
  const pathname = usePathname() ?? "";
  const base = pathname.startsWith("/analista") ? "/analista/recomendacoes" : "/admin/recomendacoes";
  const summary = useMemo(() => summarize(items), [items]);

  const columns = useMemo(() => {
    const map = new Map<AdminRecommendationView, AdminRecommendationItem[]>();
    for (const item of items) {
      const arr = map.get(item.view) ?? [];
      arr.push(item);
      map.set(item.view, arr);
    }

    return ADMIN_RECOMMENDATION_KANBAN_ORDER.map((view) => {
      const meta = STATUS_META[view];
      return {
        id: view,
        label: meta.label,
        description: meta.description,
        accentClass: ADMIN_RECOMMENDATION_COLUMN_ACCENT[view],
        items: map.get(view) ?? [],
      };
    });
  }, [items]);

  const hasAny = columns.some((c) => c.items.length > 0);
  if (!hasAny) return null;

  const footer = (
    <>
      <span>
        {summary.inExecution} em execução · {summary.withoutPlan} sem plano · {summary.overdue}{" "}
        atrasadas · {summary.completed} concluídas
      </span>
      <span className="text-slate-400">Role horizontalmente para ver todas as colunas</span>
    </>
  );

  return (
    <WorkflowKanbanBoard
      columns={columns}
      showEmptyColumns={false}
      emptyColumnMessage="Nenhuma recomendação nesta coluna"
      getItemKey={(item) => item.recommendationId}
      renderCard={(item) => <AdminRecommendationCard item={item} baseHref={base} />}
      footer={footer}
    />
  );
}
