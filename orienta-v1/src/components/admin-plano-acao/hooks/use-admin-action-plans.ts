"use client";

import { useMemo } from "react";
import { useAdminActionPlanOverviewFetch } from "@/lib/hooks/use-admin-action-plan-overview-fetch";
import { expandActionPlanListRows } from "@/lib/action-plans/list-expand";
import {
  toAdminPlanItem,
  type AdminPlanItem,
} from "@/lib/action-plans/admin-monitoring";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";

export type UseAdminActionPlansResult = {
  items: AdminPlanItem[];
  filterOptions: RecommendationFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Lista cross-org recomendação + planos (uma linha por ação).
 */
export function useAdminActionPlans(): UseAdminActionPlansResult {
  const { rawItems, filterOptions, loading, error, refetch } = useAdminActionPlanOverviewFetch();

  const items = useMemo(() => {
    const now = new Date();
    const expanded = rawItems.flatMap((row) => expandActionPlanListRows(row));
    return expanded.map((row) => toAdminPlanItem(row, now));
  }, [rawItems]);

  return useMemo(
    () => ({ items, filterOptions, loading, error, refetch }),
    [items, filterOptions, loading, error, refetch],
  );
}
