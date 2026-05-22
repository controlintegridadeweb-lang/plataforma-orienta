"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listRespondentEvidences,
  type RespondentEvidenceFilters,
} from "@/lib/evidences/respondent-client";
import type { RespondentEvidenceListResult } from "@/lib/evidences/respondent-service";

export function useRespondentEvidences(filters: RespondentEvidenceFilters) {
  const [result, setResult] = useState<RespondentEvidenceListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await listRespondentEvidences(filters);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar evidências.");
    } finally {
      setLoading(false);
    }
  }, [
    filters.formId,
    filters.search,
    filters.from,
    filters.to,
    filters.status,
    filters.pendingOnly,
    filters.limit,
    filters.offset,
  ]);

  useEffect(() => {
    void fetchList();
  }, [fetchList]);

  return { result, loading, error, refetch: fetchList };
}
