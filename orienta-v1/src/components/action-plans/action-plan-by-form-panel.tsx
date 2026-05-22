"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { fetchActionPlanByForm } from "@/lib/action-plans/client";
import { actionPlanRowKey } from "@/lib/action-plans/list-expand";
import type {
  ActionPlanAxisNode,
  ActionPlanByFormPayload,
  ActionPlanRecommendationNode,
} from "@/lib/domain/action-plans";
import { ActionPlanActionRow } from "./action-plan-action-row";
import { ActionPlanRecommendationCard } from "./action-plan-recommendation-card";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";

const AXIS_FILTER_ALL = "__all__";

function normalizeByFormError(raw: unknown): string {
  const msg = raw instanceof Error ? raw.message : String(raw);
  const m = msg.toLowerCase();
  if (
    m.includes("axis_id") ||
    m.includes("eixo") ||
    m.includes("axis") ||
    m.includes("resolver") ||
    m.includes("biblioteca")
  ) {
    return [
      "Não foi possível montar o plano agrupado por eixo.",
      "Verifique se a pergunta da recomendação está vinculada a um eixo na biblioteca ou na seção do formulário; em seguida tente novamente.",
      "",
      `(Detalhe técnico: ${msg})`,
    ].join(" ");
  }
  return msg || "Falha ao carregar plano agrupado.";
}

function recommendationMatchesSnippet(rec: ActionPlanRecommendationNode, q: string): boolean {
  const hay =
    `${rec.recommendationText} ${rec.questionPrompt} ${rec.sectionName} ${rec.actions
      .map((a) => a.actionText)
      .join(" ")}`.toLowerCase();
  return hay.includes(q);
}

function filterAxes(payload: ActionPlanByFormPayload, axisKey: string, snippet: string): ActionPlanAxisNode[] {
  const q = snippet.trim().toLowerCase();
  let axes =
    axisKey === AXIS_FILTER_ALL
      ? payload.axes
      : payload.axes.filter((a) => (a.axisId || a.axisName) === axisKey);
  if (!q) return axes;
  return axes
    .map((axis) => ({
      ...axis,
      recommendations: axis.recommendations.filter((rec) => recommendationMatchesSnippet(rec, q)),
    }))
    .filter((axis) => axis.recommendations.length > 0);
}

type Props = {
  formId: string;
  organizationId?: string;
  getRecommendationPlanHref?: (recommendationId: string) => string;
  onOpenMonitor?: (rowKey: string) => void;
  onCreateAction?: (
    recommendation: ActionPlanRecommendationNode,
    ctx: Pick<ActionPlanByFormPayload, "formId" | "formName" | "formVersion">,
    axisName: string,
  ) => void;
  reloadToken?: number;
};

export function ActionPlanByFormPanel({
  formId,
  organizationId,
  getRecommendationPlanHref,
  onOpenMonitor,
  onCreateAction,
  reloadToken = 0,
}: Props) {
  const [data, setData] = useState<ActionPlanByFormPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [axisFilter, setAxisFilter] = useState(AXIS_FILTER_ALL);
  const [snippet, setSnippet] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchActionPlanByForm(formId, organizationId)
      .then((payload) => {
        if (!cancelled) setData(payload);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(normalizeByFormError(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId, organizationId, reloadToken]);

  useEffect(() => {
    setAxisFilter(AXIS_FILTER_ALL);
    setSnippet("");
  }, [formId]);

  const axesFiltered = useMemo(() => {
    if (!data) return [];
    return filterAxes(data, axisFilter, snippet);
  }, [data, axisFilter, snippet]);

  if (loading && !data) {
    return <p className={typography.meta}>Carregando visão agrupada por eixo…</p>;
  }
  if (error) {
    return <p className={formSurface.messageError}>{error}</p>;
  }
  if (!data) return null;

  const s = data.summary;

  return (
    <div className={layout.sectionStack}>
      <p className={typography.auxiliary}>
        <span className="font-medium text-slate-800">
          {data.formName} · {data.organizationName}
        </span>
        {" — "}
        {s.totalRecommendations} recomendações · {s.totalActions}{" "}
        {s.totalActions === 1 ? "ação" : "ações"} · {s.recommendationsWithActions} com pelo menos uma
        ação cadastrada.
      </p>

      <div className={`${formSurface.dashboardPanel} p-4 sm:p-5`}>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Filtrar eixo</span>
            <select
              className={formSurface.inputSelect}
              value={axisFilter}
              onChange={(e) => setAxisFilter(e.target.value)}
            >
              <option value={AXIS_FILTER_ALL}>Todos os eixos ({data.axes.length})</option>
              {data.axes.map((axis) => (
                <option key={axis.axisId || axis.axisName} value={axis.axisId || axis.axisName}>
                  {axis.axisName}
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>
              <Search className="mr-1 inline h-3.5 w-3.5 opacity-70" aria-hidden />
              Buscar na recomendação ou nas ações
            </span>
            <input
              type="search"
              autoComplete="off"
              placeholder="Digite parte do texto…"
              value={snippet}
              onChange={(e) => setSnippet(e.target.value)}
              className={formSurface.input}
            />
          </label>
        </div>
      </div>

      {axesFiltered.length === 0 ? (
        <p className={`${formSurface.messageNeutral} text-sm`}>
          Nenhum resultado para o eixo ou texto combinados — ajuste os filtros.
        </p>
      ) : (
        <div className="space-y-4">
          {axesFiltered.map((axis, axisIdx) => (
            <section key={axis.axisId || `${axis.axisName}-${axisIdx}`} className={formSurface.nestedCardWithHeader}>
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 bg-slate-50/60 px-4 py-3 sm:px-5">
                <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                  {axis.axisName}
                  <span className="ml-2 text-xs font-normal text-slate-500">
                    {axis.recommendations.length} recom.
                    {snippet.trim() ? " no filtro" : ""}
                  </span>
                </h3>
              </header>
              <div className="max-h-[min(68vh,40rem)] space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-5">
                {axis.recommendations.map((rec) => (
                  <ActionPlanRecommendationCard
                    key={rec.recommendationId}
                    recommendationText={rec.recommendationText}
                    actionCount={rec.actions.length}
                    headerActions={
                      onCreateAction ? (
                        <button
                          type="button"
                          className={formSurface.secondaryButtonSm}
                          onClick={() =>
                            onCreateAction(
                              rec,
                              {
                                formId: data.formId,
                                formName: data.formName,
                                formVersion: data.formVersion,
                              },
                              axis.axisName,
                            )
                          }
                        >
                          Nova ação
                        </button>
                      ) : undefined
                    }
                  >
                    {rec.actions.length === 0 ? (
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 py-5">
                        <p className={`${typography.auxiliary} text-sm`}>
                          Nenhuma ação registrada nesta recomendação.
                        </p>
                        {getRecommendationPlanHref ? (
                          <Link
                            href={getRecommendationPlanHref(rec.recommendationId)}
                            className={`${formSurface.primaryButtonSm} inline-flex shrink-0 items-center gap-1.5`}
                          >
                            Abrir plano de ação
                            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                          </Link>
                        ) : onOpenMonitor ? (
                          <button
                            type="button"
                            className={formSurface.primaryButtonSm}
                            onClick={() =>
                              onOpenMonitor(actionPlanRowKey(null, rec.recommendationId))
                            }
                          >
                            Registrar primeira ação
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {rec.actions.map((ac) => (
                          <ActionPlanActionRow
                            key={ac.id}
                            actionText={ac.actionText}
                            status={ac.status}
                            dueDate={ac.dueDate}
                            responsibleName={ac.responsibleName}
                            responsibleSector={ac.responsibleSector}
                            href={
                              getRecommendationPlanHref
                                ? getRecommendationPlanHref(rec.recommendationId)
                                : undefined
                            }
                            onOpen={
                              onOpenMonitor
                                ? () => onOpenMonitor(actionPlanRowKey(ac.id, rec.recommendationId))
                                : undefined
                            }
                            openLabel={
                              getRecommendationPlanHref ? "Abrir plano de ação" : "Abrir esta ação"
                            }
                          />
                        ))}
                      </ul>
                    )}
                  </ActionPlanRecommendationCard>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
