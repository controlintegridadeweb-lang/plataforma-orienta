"use client";

import { useMemo } from "react";
import { useAdminActionPlanOverviewFetch } from "@/lib/hooks/use-admin-action-plan-overview-fetch";
import {
  toAdminItem,
  type AdminRecommendationItem,
} from "@/lib/recommendations/admin-presentation";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";

export type UseAdminRecommendationsResult = {
  items: AdminRecommendationItem[];
  filterOptions: RecommendationFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Painel admin de recomendações — lista via action-plans overview + filtros.
 */
export function useAdminRecommendations(): UseAdminRecommendationsResult {
  const { rawItems, filterOptions, loading, error, refetch } = useAdminActionPlanOverviewFetch();

  const items = useMemo(() => rawItems.map(toAdminItem), [rawItems]);

  return useMemo(
    () => ({ items, filterOptions, loading, error, refetch }),
    [items, filterOptions, loading, error, refetch],
  );
}
