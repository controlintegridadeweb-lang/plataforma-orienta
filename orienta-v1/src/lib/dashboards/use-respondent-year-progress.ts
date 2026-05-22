"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RespondentProgress } from "@/lib/dashboards/queries";
import { fetchRespondentFormsProgress } from "@/lib/dashboards/client";
import {
  computeRespondentDashboardSummary,
  type RespondentDashboardSummary,
} from "@/lib/dashboards/respondent-dashboard-summary";

type Options = {
  initialForms: RespondentProgress[];
  initialYear: number;
  initialSummary?: RespondentDashboardSummary;
};

/**
 * Carrega progresso do respondente sempre que o ano muda (sem reutilizar cache SSR).
 */
export function useRespondentYearProgress({
  initialForms,
  initialYear,
  initialSummary,
}: Options) {
  const [year, setYear] = useState(initialYear);
  const [forms, setForms] = useState(initialForms);
  const [summary, setSummary] = useState(
    initialSummary ?? computeRespondentDashboardSummary(initialForms),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);
  const hasFetchedOtherYear = useRef(false);

  const load = useCallback(async (periodYear: number) => {
    const seq = ++requestSeq.current;
    setLoading(true);
    setError(null);
    try {
      const res = await fetchRespondentFormsProgress(periodYear);
      if (seq !== requestSeq.current) return;
      setForms(res.items);
      setSummary(computeRespondentDashboardSummary(res.items));
    } catch (e: unknown) {
      if (seq !== requestSeq.current) return;
      setError(e instanceof Error ? e.message : "Falha ao carregar dados.");
      setForms([]);
      setSummary(computeRespondentDashboardSummary([]));
    } finally {
      if (seq === requestSeq.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (year === initialYear && !hasFetchedOtherYear.current) return;
    void load(year);
  }, [year, initialYear, load]);

  const setYearAndFetch = useCallback((next: number) => {
    if (next !== initialYear) hasFetchedOtherYear.current = true;
    setYear(next);
  }, [initialYear]);

  return { year, setYear: setYearAndFetch, forms, summary, loading, error };
}
