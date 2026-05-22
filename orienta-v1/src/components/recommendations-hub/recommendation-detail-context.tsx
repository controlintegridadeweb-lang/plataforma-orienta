"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import { listActionPlans, listRespondentActionPlans } from "@/lib/action-plans/client";
import type { StaffAreaPrefix } from "@/lib/admin/queue-links";
import { staffAreaFromPathname } from "@/lib/navigation/staff-paths";
import { usePathname } from "next/navigation";
import { toAdminItem, type AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import {
  toRespondentItem,
  type RespondentRecommendationItem,
} from "@/lib/recommendations/respondent-presentation";
import { describeError } from "@/lib/notify";

export type RecommendationDetailRole = "respondent" | "staff";

export type RecommendationWorkspaceSurface = "default" | "operational" | "supervision" | "document";

type ContextValue = {
  role: RecommendationDetailRole;
  recommendationId: string;
  listPath: string;
  detailBasePath: string;
  /** Segmento da URL da aba de execução (`plano` em rotas staff; `acoes` no workspace do respondente). */
  actionsTabHrefSegment: string;
  actionsTabLabel: string;
  workspaceSurface: RecommendationWorkspaceSurface;
  staffArea: StaffAreaPrefix | null;
  row: ActionPlanListItem | null;
  respondentItem: RespondentRecommendationItem | null;
  staffItem: AdminRecommendationItem | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
};

const RecommendationDetailContext = createContext<ContextValue | null>(null);

export function RecommendationDetailProvider({
  recommendationId,
  role,
  listPath,
  detailBasePath: detailBasePathOverride,
  actionsTabHrefSegment = "plano",
  actionsTabLabel = "Plano de ação",
  workspaceSurface = "default",
  children,
}: {
  recommendationId: string;
  role: RecommendationDetailRole;
  listPath: string;
  /** Quando omitido: `{listPath}/{recommendationId}` (hub junto à lista). */
  detailBasePath?: string;
  actionsTabHrefSegment?: string;
  actionsTabLabel?: string;
  workspaceSurface?: RecommendationWorkspaceSurface;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const staffArea = role === "staff" ? staffAreaFromPathname(pathname) : null;
  const detailBasePath = detailBasePathOverride ?? `${listPath}/${recommendationId}`;

  const [row, setRow] = useState<ActionPlanListItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result =
        role === "respondent"
          ? await listRespondentActionPlans({
              recommendationId,
              view: "overview",
              limit: 5,
              offset: 0,
            })
          : await listActionPlans({
              recommendationId,
              view: "overview",
              limit: 5,
              offset: 0,
            });
      const item = result.items[0] ?? null;
      setRow(item);
      if (!item) setError("Recomendação não encontrada ou sem permissão para visualizar.");
    } catch (e) {
      setRow(null);
      setError(describeError(e, "Falha ao carregar a recomendação."));
    } finally {
      setLoading(false);
    }
  }, [recommendationId, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const respondentItem = useMemo(
    () => (row ? toRespondentItem(row) : null),
    [row],
  );
  const staffItem = useMemo(() => (row ? toAdminItem(row) : null), [row]);

  const value = useMemo<ContextValue>(
    () => ({
      role,
      recommendationId,
      listPath,
      detailBasePath,
      actionsTabHrefSegment,
      actionsTabLabel,
      workspaceSurface,
      staffArea,
      row,
      respondentItem,
      staffItem,
      loading,
      error,
      refetch: load,
    }),
    [
      role,
      recommendationId,
      listPath,
      detailBasePath,
      actionsTabHrefSegment,
      actionsTabLabel,
      workspaceSurface,
      staffArea,
      row,
      respondentItem,
      staffItem,
      loading,
      error,
      load,
    ],
  );

  return (
    <RecommendationDetailContext.Provider value={value}>
      {children}
    </RecommendationDetailContext.Provider>
  );
}

export function useRecommendationDetailContext(): ContextValue {
  const ctx = useContext(RecommendationDetailContext);
  if (!ctx) {
    throw new Error("useRecommendationDetailContext must be used within RecommendationDetailProvider");
  }
  return ctx;
}
