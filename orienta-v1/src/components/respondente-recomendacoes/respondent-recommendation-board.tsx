"use client";

import { useMemo } from "react";
import { WorkflowKanbanBoard } from "@/components/ui/workflow-kanban-board";
import { RESPONDENT_RECOMMENDATION_COLUMN_ACCENT } from "@/lib/recommendations/kanban-column-accents";
import {
  RESPONDENT_RECOMMENDATION_KANBAN_ORDER,
  RESPONDENT_VIEW_META,
  summarize,
  type RespondentRecommendationItem,
  type RespondentRecommendationView,
} from "@/lib/recommendations/respondent-presentation";
import { RespondentRecommendationCard } from "./respondent-recommendation-card";

type Props = {
  items: RespondentRecommendationItem[];
  /** Exibe totais no rodapé do painel Kanban. */
  showFooter?: boolean;
};

export function RespondentRecommendationBoard({ items, showFooter = true }: Props) {
  const summary = useMemo(() => summarize(items), [items]);

  const columns = useMemo(() => {
    const map = new Map<RespondentRecommendationView, RespondentRecommendationItem[]>();
    for (const item of items) {
      const arr = map.get(item.view) ?? [];
      arr.push(item);
      map.set(item.view, arr);
    }

    return RESPONDENT_RECOMMENDATION_KANBAN_ORDER.map((view) => {
      const meta = RESPONDENT_VIEW_META[view];
      return {
        id: view,
        label: meta.label,
        description: meta.description,
        accentClass: RESPONDENT_RECOMMENDATION_COLUMN_ACCENT[view],
        items: map.get(view) ?? [],
      };
    });
  }, [items]);

  const hasAny = columns.some((c) => c.items.length > 0);
  if (!hasAny) return null;

  const footer = showFooter ? (
    <>
      <span>
        {summary.inProgress} em andamento · {summary.awaitingAction} aguardando ação ·{" "}
        {summary.resolved} concluídas
      </span>
      <span className="text-slate-400">Role horizontalmente para ver todas as colunas</span>
    </>
  ) : undefined;

  return (
    <WorkflowKanbanBoard
      columns={columns}
      showEmptyColumns
      emptyColumnMessage="Nenhuma recomendação nesta coluna"
      getItemKey={(item) => item.recommendationId}
      renderCard={(item) => <RespondentRecommendationCard item={item} />}
      footer={footer}
    />
  );
}
