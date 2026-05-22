"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getRespondentEvidenceStats,
  type RespondentEvidenceFilters,
} from "@/lib/evidences/respondent-client";
import type { RespondentStatsResult } from "@/lib/evidences/respondent-service";

type FilterSlice = Pick<RespondentEvidenceFilters, "formId" | "search" | "from" | "to">;

export function useRespondentStats(filters: FilterSlice, refreshSignal: number) {
  const [stats, setStats] = useState<RespondentStatsResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getRespondentEvidenceStats(filters);
      setStats(s);
    } catch {
      // Erro nao bloqueia a tela; KPIs ficam com fallback de 0.
    } finally {
      setLoading(false);
    }
  }, [filters.formId, filters.search, filters.from, filters.to]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats, refreshSignal]);

  return { stats, loading };
}
