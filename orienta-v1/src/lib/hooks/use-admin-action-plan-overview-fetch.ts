"use client";

import { useCallback, useEffect, useState } from "react";
import { listActionPlans } from "@/lib/action-plans/client";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { describeError, notify } from "@/lib/notify";

const PAGE_SIZE = 200;
const HARD_LIMIT = 2000;

export type AdminOverviewFetchState = {
  rawItems: ActionPlanListItem[];
  filterOptions: RecommendationFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

/**
 * Busca paginada compartilhada para listas admin/analista baseadas em
 * `/api/admin/action-plans?view=overview`.
 */
export function useAdminActionPlanOverviewFetch(): AdminOverviewFetchState {
  const [rawItems, setRawItems] = useState<ActionPlanListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<RecommendationFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let combined: ActionPlanListItem[] = [];
      let offset = 0;
      let total = 0;
      do {
        const res = await listActionPlans({
          view: "overview",
          limit: PAGE_SIZE,
          offset,
        });
        combined = combined.concat(res.items);
        total = res.total;
        offset += res.items.length;
        if (res.items.length === 0) break;
      } while (offset < total && combined.length < HARD_LIMIT);
      setRawItems(combined);
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao carregar dados.");
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  useEffect(() => {
    void loadRecommendationFilters()
      .then(setFilterOptions)
      .catch((e: unknown) => {
        notify.error(describeError(e, "Falha ao carregar filtros."));
      });
  }, []);

  const refetch = useCallback(async () => {
    await fetchAll();
  }, [fetchAll]);

  return {
    rawItems,
    filterOptions,
    loading,
    error,
    refetch,
  };
}
