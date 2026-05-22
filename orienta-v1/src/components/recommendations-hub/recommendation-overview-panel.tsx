"use client";

import { useMemo } from "react";
import { PanelSection } from "@/components/ui/panel-section";
import { RecommendationActions } from "@/components/recomendacoes/recommendation-actions";
import { recommendationListItemFromActionPlanRow } from "@/lib/recommendations/list-item-from-action-plan";
import type { RecommendationListItem } from "@/lib/recommendations/admin-service";
import { OverviewStrategicLayout } from "./overview-strategic-layout";
import { useRecommendationDetailContext } from "./recommendation-detail-context";

export function RecommendationOverviewPanel() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;

  const editable: RecommendationListItem | null = useMemo(() => {
    if (ctx.role !== "staff" || !row) return null;
    return recommendationListItemFromActionPlanRow(row);
  }, [ctx.role, row]);

  if (!row) return null;

  return (
    <div className="space-y-8">
      <OverviewStrategicLayout row={row} />

      {ctx.role === "staff" && editable ? (
        <PanelSection
          title="Gestão da recomendação"
          description="Status e ações administrativas."
          variant="card"
        >
          <RecommendationActions
            item={editable}
            onUpdated={() => {
              void ctx.refetch();
            }}
          />
        </PanelSection>
      ) : null}
    </div>
  );
}
