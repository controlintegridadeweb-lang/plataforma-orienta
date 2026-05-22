"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import {
  getRespondentOverviewCacheVersion,
  getRespondentOverviewItems,
  invalidateRespondentOverviewCache,
  subscribeRespondentOverviewCache,
} from "./respondent-overview-cache";

export function useRespondentOverviewItems() {
  const version = useSyncExternalStore(
    subscribeRespondentOverviewCache,
    getRespondentOverviewCacheVersion,
    getRespondentOverviewCacheVersion,
  );
  const [items, setItems] = useState<ActionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force?: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const rows = await getRespondentOverviewItems({ force });
      setItems(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar dados.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, version]);

  const refetch = useCallback(async () => {
    invalidateRespondentOverviewCache();
    await load(true);
  }, [load]);

  return useMemo(
    () => ({ items, loading, error, refetch }),
    [items, loading, error, refetch],
  );
}
