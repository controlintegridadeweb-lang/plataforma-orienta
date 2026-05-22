"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listRespondentActionPlans } from "@/lib/action-plans/client";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import { expandActionPlanListRows } from "@/lib/action-plans/list-expand";
import {
  summarize,
  toRespondentItem,
  type RespondentActionPlanItem,
  type RespondentActionPlanSummary,
} from "@/lib/action-plans/respondent-presentation";

type State = {
  rows: RespondentActionPlanItem[];
  summary: RespondentActionPlanSummary;
};

const EMPTY_STATE: State = {
  rows: [],
  summary: {
    total: 0,
    notStarted: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0,
    dueSoon: 0,
    noPlan: 0,
  },
};

/**
 * Fonte unica de dados do Plano de Acao do respondente. Usa o endpoint
 * `/api/respondent/action-plans?view=overview` que ja escopa por organizacao.
 */
export function useRespondentActionPlans() {
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
      const expanded = (res.items as ActionPlanListItem[]).flatMap((row) =>
        expandActionPlanListRows(row),
      );
      const rows = expanded.map(toRespondentItem);
      setState({ rows, summary: summarize(rows) });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar ações.");
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
