"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listActionPlans } from "@/lib/action-plans/client";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import { expandActionPlanListRows } from "@/lib/action-plans/list-expand";
import {
  toAdminPlanItem,
  type AdminPlanItem,
} from "@/lib/action-plans/admin-monitoring";
import { describeError, notify } from "@/lib/notify";

export type UseAdminActionPlansResult = {
  items: AdminPlanItem[];
  filterOptions: RecommendationFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const PAGE_SIZE = 200;
const HARD_LIMIT = 2000;

/**
 * Lista cross-org recomendacao + planos para o admin/analista. Expande cada
 * recomendacao em uma linha por acao cadastrada.
 */
export function useAdminActionPlans(): UseAdminActionPlansResult {
  const [items, setItems] = useState<AdminPlanItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<RecommendationFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const now = new Date();
      let combinedRaw: ActionPlanListItem[] = [];
      let offset = 0;
      let total = 0;
      do {
        const res = await listActionPlans({
          view: "overview",
          limit: PAGE_SIZE,
          offset,
        });
        combinedRaw = combinedRaw.concat(res.items);
        total = res.total;
        offset += res.items.length;
        if (res.items.length === 0) break;
      } while (offset < total && combinedRaw.length < HARD_LIMIT);

      const expanded = combinedRaw.flatMap((row) => expandActionPlanListRows(row));
      setItems(expanded.map((row) => toAdminPlanItem(row, now)));
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao carregar planos de ação.");
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

  return useMemo(
    () => ({ items, filterOptions, loading, error, refetch }),
    [items, filterOptions, loading, error, refetch],
  );
}
