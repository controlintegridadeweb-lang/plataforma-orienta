"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listActionPlans } from "@/lib/action-plans/client";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import {
  toAdminItem,
  type AdminRecommendationItem,
} from "@/lib/recommendations/admin-presentation";
import { describeError, notify } from "@/lib/notify";

export type UseAdminRecommendationsResult = {
  items: AdminRecommendationItem[];
  filterOptions: RecommendationFilterOptions | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const PAGE_SIZE = 200;

/**
 * Hook unico para o painel admin de recomendacoes.
 *
 * Le de `/api/admin/action-plans?view=overview` (lista cross-org de recomendacoes
 * + plano vinculado, ja respeitando o escopo do caller) e de
 * `/api/admin/recommendations/filters` (catalogo para os dropdowns).
 */
export function useAdminRecommendations(): UseAdminRecommendationsResult {
  const [items, setItems] = useState<AdminRecommendationItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<RecommendationFilterOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let allItems: AdminRecommendationItem[] = [];
      let offset = 0;
      let total = 0;
      do {
        const res = await listActionPlans({
          view: "overview",
          limit: PAGE_SIZE,
          offset,
        });
        const mapped = res.items.map(toAdminItem);
        allItems = allItems.concat(mapped);
        total = res.total;
        offset += res.items.length;
        if (res.items.length === 0) break;
      } while (offset < total && allItems.length < 2000);
      setItems(allItems);
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao carregar recomendações.");
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
