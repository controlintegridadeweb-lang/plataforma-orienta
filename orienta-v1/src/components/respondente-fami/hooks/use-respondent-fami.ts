"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FAMI_ALL_FORMS } from "@/lib/fami/constants";
import { loadFamiSnapshot, type FamiSnapshotResponse } from "@/lib/fami/client";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { getRespondentEvidenceStats } from "@/lib/evidences/respondent-client";
import type { RespondentStatsResult } from "@/lib/evidences/respondent-service";
import { listRespondentActionPlans } from "@/lib/action-plans/client";
import {
  toRespondentItem,
  type RespondentRecommendationItem,
} from "@/lib/recommendations/respondent-presentation";

export type RespondentFamiState = {
  filters: RecommendationFilterOptions | null;
  /** `"all"` = visão institucional consolidada; caso contrário UUID do formulário. */
  formId: string;
  institutional: FamiSnapshotResponse | null;
  formScoped: FamiSnapshotResponse | null;
  evidenceStats: RespondentStatsResult | null;
  recommendations: RespondentRecommendationItem[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

export function useRespondentFami(initialOrganizationId: string | null) {
  const [filters, setFilters] = useState<RecommendationFilterOptions | null>(null);
  const [formId, setFormId] = useState<string>(FAMI_ALL_FORMS);
  const [organizationId, setOrganizationId] = useState<string>(
    initialOrganizationId ?? "",
  );

  const [institutional, setInstitutional] = useState<FamiSnapshotResponse | null>(null);
  const [formScoped, setFormScoped] = useState<FamiSnapshotResponse | null>(null);
  const [evidenceStats, setEvidenceStats] = useState<RespondentStatsResult | null>(null);
  const [recommendations, setRecommendations] = useState<RespondentRecommendationItem[]>(
    [],
  );

  const [bootLoading, setBootLoading] = useState(true);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotYearFilter, setSnapshotYearFilter] = useState<number | null>(null);

  const isInstitutionalView = formId === FAMI_ALL_FORMS;

  const activeSnapshot = useMemo(
    () => (isInstitutionalView ? institutional : formScoped),
    [isInstitutionalView, institutional, formScoped],
  );

  useEffect(() => {
    let cancelled = false;
    async function boot() {
      setBootLoading(true);
      setError(null);
      try {
        const [filtersRes, stats, plans] = await Promise.all([
          loadRecommendationFilters(),
          getRespondentEvidenceStats().catch(() => null),
          listRespondentActionPlans({ view: "overview", limit: 200, offset: 0 }).catch(
            () => null,
          ),
        ]);
        if (cancelled) return;
        setFilters(filtersRes);
        setEvidenceStats(stats);
        if (plans) {
          setRecommendations(plans.items.map(toRespondentItem));
        } else {
          setRecommendations([]);
        }
        if (!organizationId && filtersRes.organizations.length === 1) {
          setOrganizationId(filtersRes.organizations[0]!.id);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar filtros.");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    }
    void boot();
    return () => {
      cancelled = true;
    };
  }, [organizationId]);

  useEffect(() => {
    setSnapshotYearFilter(null);
  }, [formId, organizationId]);

  const fetchInstitutional = useCallback(async () => {
    if (!organizationId) {
      setInstitutional(null);
      return;
    }
    const res = await loadFamiSnapshot({
      formId: FAMI_ALL_FORMS,
      organizationId,
      authRole: "respondent",
      year: snapshotYearFilter ?? undefined,
      evolutionMode: "years",
    });
    setInstitutional(res);
  }, [organizationId, snapshotYearFilter]);

  const fetchFormScoped = useCallback(async () => {
    if (!organizationId || !formId || formId === FAMI_ALL_FORMS) {
      setFormScoped(null);
      return;
    }
    const res = await loadFamiSnapshot({
      formId,
      organizationId,
      authRole: "respondent",
      year: snapshotYearFilter ?? undefined,
      evolutionMode: "years",
    });
    setFormScoped(res);
  }, [formId, organizationId, snapshotYearFilter]);

  const fetchSnapshots = useCallback(async () => {
    if (!organizationId) {
      setInstitutional(null);
      setFormScoped(null);
      return;
    }
    setSnapshotLoading(true);
    try {
      await fetchInstitutional();
      if (formId !== FAMI_ALL_FORMS) {
        await fetchFormScoped();
      } else {
        setFormScoped(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar FAMI.");
      setInstitutional(null);
      setFormScoped(null);
    } finally {
      setSnapshotLoading(false);
    }
  }, [organizationId, formId, fetchInstitutional, fetchFormScoped]);

  useEffect(() => {
    void fetchSnapshots();
  }, [fetchSnapshots]);

  const refresh = useCallback(async () => {
    await Promise.all([
      fetchSnapshots(),
      getRespondentEvidenceStats()
        .then(setEvidenceStats)
        .catch(() => undefined),
      listRespondentActionPlans({ view: "overview", limit: 200, offset: 0 })
        .then((plans) => setRecommendations(plans.items.map(toRespondentItem)))
        .catch(() => undefined),
    ]);
  }, [fetchSnapshots]);

  const axisStats = useMemo(() => {
    const map = new Map<
      string,
      {
        recommendationsOpen: number;
        recommendationsTotal: number;
        awaitingAction: number;
        evidencesPending: number;
      }
    >();
    for (const r of recommendations) {
      const key = r.axisName || "Sem eixo";
      const cell =
        map.get(key) ?? {
          recommendationsOpen: 0,
          recommendationsTotal: 0,
          awaitingAction: 0,
          evidencesPending: 0,
        };
      cell.recommendationsTotal += 1;
      if (r.view !== "resolved" && r.view !== "dismissed") {
        cell.recommendationsOpen += 1;
      }
      if (r.needsAction) cell.awaitingAction += 1;
      map.set(key, cell);
    }
    return map;
  }, [recommendations]);

  const recommendationsOpen = useMemo(
    () =>
      recommendations.filter((r) => r.view !== "resolved" && r.view !== "dismissed").length,
    [recommendations],
  );

  return {
    state: {
      filters,
      formId,
      institutional,
      formScoped,
      evidenceStats,
      recommendations,
      loading: bootLoading,
      refreshing: snapshotLoading,
      error,
    } satisfies RespondentFamiState,
    organizationId,
    setFormId,
    setSnapshotYearFilter,
    snapshotYearFilter,
    refresh,
    axisStats,
    recommendationsOpen,
    isInstitutionalView,
    activeSnapshot,
  };
}
