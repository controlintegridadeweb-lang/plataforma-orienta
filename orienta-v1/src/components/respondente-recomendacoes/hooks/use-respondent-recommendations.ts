"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listRespondentActionPlans } from "@/lib/action-plans/client";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import {
  summarize,
  toRespondentItem,
  type RespondentRecommendationItem,
  type RespondentRecommendationSummary,
} from "@/lib/recommendations/respondent-presentation";

type State = {
  rows: RespondentRecommendationItem[];
  summary: RespondentRecommendationSummary;
};

const EMPTY_STATE: State = {
  rows: [],
  summary: {
    total: 0,
    inProgress: 0,
    resolved: 0,
    awaitingAction: 0,
  },
};

/**
 * Fonte unica de dados do Portfolio de Recomendacoes do respondente:
 * usa /api/respondent/action-plans (view=overview) — ja escopado por org
 * e ja traz `plan` por recomendacao. Mapeia para o vocabulario da UI.
 */
export function useRespondentRecommendations() {
  const [state, setState] = useState<State>(EMPTY_STATE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRespondentActionPlans({
        view: "overview",
        limit: 200,
        offset: 0,
      });
      const rows = (res.items as ActionPlanListItem[]).map(toRespondentItem);
      setState({ rows, summary: summarize(rows) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar recomendações.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const formOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of state.rows) {
      if (r.formId && r.formName) map.set(r.formId, r.formName);
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [state.rows]);

  const axisOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of state.rows) {
      if (r.axisName) set.add(r.axisName);
    }
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((v) => ({ value: v, label: v }));
  }, [state.rows]);

  return {
    rows: state.rows,
    summary: state.summary,
    loading,
    error,
    formOptions,
    axisOptions,
    refetch: fetchAll,
  };
}
