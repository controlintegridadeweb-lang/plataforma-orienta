"use client";

import { useMemo } from "react";
import { useRespondentOverviewItems } from "@/lib/hooks/use-respondent-overview-items";
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
 * Portfólio estratégico do respondente — overview em cache compartilhado.
 */
export function useRespondentRecommendations() {
  const { items, loading, error, refetch } = useRespondentOverviewItems();

  const state = useMemo<State>(() => {
    const rows = items.map(toRespondentItem);
    return { rows, summary: summarize(rows) };
  }, [items]);

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
    refetch,
  };
}
