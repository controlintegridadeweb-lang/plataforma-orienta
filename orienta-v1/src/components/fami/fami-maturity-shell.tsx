"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Layers,
  Percent,
  Sparkles,
  Clock,
} from "lucide-react";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import { AxisBarChart } from "@/components/charts/axis-bar-chart";
import { formSurface } from "@/lib/layout/form-surface";
import { typography } from "@/lib/layout/design-system";
import {
  loadFamiSnapshot,
  reprocessFamiRequest,
  type FamiSnapshotResponse,
} from "@/lib/fami/client";
import {
  evolutionDelta,
  evolutionDeltaByYear,
  interpretSnapshot,
  rankAxesByImpact,
  TREND_META,
} from "@/lib/fami/respondent-presentation";
import { PanelSection } from "@/components/ui/panel-section";
import { MetricCard } from "@/components/ui/metric-card";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { YearSelect } from "@/components/ui/year-select";
import { AdminFamiMaturityHero } from "@/components/fami/admin-fami-maturity-hero";
import { RespondentFamiRadarChart } from "@/components/respondente-fami/respondent-fami-radar-chart";
import { staffQueueHref } from "@/lib/admin/queue-links";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/layout/admin-page-layout";
import { formatFamiUpdatedAt } from "@/lib/fami/format-updated-at";
import { describeError, notify } from "@/lib/notify";
import { FamiEvolutionChart } from "./fami-evolution-chart";
import { FamiMethodologyGuide } from "./fami-methodology-guide";
import { FamiMaturityAxisCard } from "./fami-maturity-axis-card";
import { FamiMaturityExecutiveInsights } from "./fami-maturity-executive-insights";
import { FamiMaturitySectionBreak } from "./fami-maturity-section-break";

/** Ritmo vertical entre grandes blocos da tela Maturidade FAMI. */
const FAMI_SECTION_STACK = "space-y-10 lg:space-y-12";
const FAMI_KPI_GRID = "grid gap-5 md:grid-cols-2 md:gap-6 xl:grid-cols-4 xl:gap-6";

type Props = {
  mode: "admin" | "respondent";
  /**
   * Para admin: aceita uma UUID, string vazia (Geral / todas as organizacoes)
   * ou `null` quando nao houve escolha. Para respondent: aceita a
   * UUID da organizacao do perfil.
   */
  defaultOrganizationId: string | null;
  /** Prefill do seletor de formulário (ex.: deep-link na URL). */
  defaultFormId?: string | null;
};

type TabId = "resumo" | "secoes" | "evolucao";

/**
 * Sentinela usado pelo seletor de organizacao para representar a visao Geral
 * (agregado de todas as organizacoes). O endpoint aceita o valor "all" na
 * query string; o componente mantem `organizationId === ""` como estado.
 */
const ALL_ORGS_LABEL = "Geral (todas as organizações)";

function isPermissionMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("forbidden") ||
    m.includes("permitida") ||
    m.includes("permissao") ||
    m.includes("403")
  );
}

export function FamiMaturityShell({
  mode,
  defaultOrganizationId,
  defaultFormId,
}: Props) {
  const [filters, setFilters] = useState<RecommendationFilterOptions | null>(null);

  /** `null` = último FAMI; apenas visível quando não é vista Geral. */
  const [snapshotYearFilter, setSnapshotYearFilter] = useState<number | null>(null);

  const isAdmin = mode === "admin";
  /**
   * Para admin, aceitamos `defaultOrganizationId === "all"` como deep-link
   * para a visao Geral; convertemos para string vazia (estado interno).
   */
  const normalizedDefaultOrgId =
    defaultOrganizationId === "all" && isAdmin ? "" : (defaultOrganizationId ?? "");
  const [organizationId, setOrganizationId] = useState(normalizedDefaultOrgId);
  const [formId, setFormId] = useState("");
  const [tab, setTab] = useState<TabId>("resumo");

  /**
   * Apenas admin pode disparar a visao Geral. Para outros perfis, a string
   * vazia continua significando "sem organizacao no perfil" (estado de erro).
   */
  const isGlobalView = isAdmin && organizationId === "";

  const [data, setData] = useState<FamiSnapshotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);

  useEffect(() => {
    if (defaultOrganizationId === "all" && isAdmin) {
      setOrganizationId("");
    } else if (defaultOrganizationId) {
      setOrganizationId(defaultOrganizationId);
    }
  }, [defaultOrganizationId, isAdmin]);

  useEffect(() => {
    if (defaultFormId) {
      setFormId(defaultFormId);
    }
  }, [defaultFormId]);

  useEffect(() => {
    loadRecommendationFilters()
      .then(setFilters)
      .catch((e: unknown) =>
        notify.error(describeError(e, "Falha ao carregar filtros.")),
      );
  }, []);

  /** Se ainda nao houver escolha, assume o primeiro formulario da lista (alinhado ao portfolio). */
  const effectiveFormId = useMemo(() => {
    if (!filters?.forms.length) return "";
    if (formId && filters.forms.some((f) => f.id === formId)) return formId;
    return filters.forms[0]!.id;
  }, [formId, filters]);

  /** Troca escopo/org/form: volta ao último FAMI atual (evita misturar filtros entre contextos). */
  useEffect(() => {
    setSnapshotYearFilter(null);
  }, [effectiveFormId, organizationId, isGlobalView]);

  const fetchSnapshot = useCallback(async () => {
    if (!effectiveFormId) {
      setData(null);
      return;
    }
    if (!organizationId && !isGlobalView) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const res = await loadFamiSnapshot({
        formId: effectiveFormId,
        organizationId: isGlobalView ? "all" : organizationId,
        authRole: mode,
        ...(isGlobalView
          ? {}
          : {
              year: snapshotYearFilter ?? undefined,
              evolutionMode: "years" as const,
            }),
      });
      setData(res);
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao carregar.");
      const message = isPermissionMessage(msg)
        ? `${msg} Verifique se o perfil tem acesso a esta organizacao.`
        : msg;
      notify.error(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [
    effectiveFormId,
    organizationId,
    isGlobalView,
    mode,
    snapshotYearFilter,
  ]);

  useEffect(() => {
    void fetchSnapshot();
  }, [fetchSnapshot]);

  /**
   * A vista de evolucao agrega por processing_version, que e independente em
   * cada organizacao. Na visao Geral nao ha eixo temporal coerente, entao
   * voltamos para Resumo automaticamente.
   */
  useEffect(() => {
    if (isGlobalView && tab === "evolucao") setTab("resumo");
  }, [isGlobalView, tab]);

  async function handleReprocess() {
    if (!effectiveFormId || !organizationId) return;
    if (isGlobalView) {
      notify.error(
        "Reprocessamento exige uma organizacao especifica. Selecione uma organizacao para continuar.",
      );
      return;
    }
    if (
      !window.confirm(
        "Reprocessar FAMI recalcula pontuacoes e substitui as recomendacoes deste formulario para a organizacao. Continuar?",
      )
    ) {
      return;
    }
    setReprocessLoading(true);
    try {
      const result = await reprocessFamiRequest({
        formId: effectiveFormId,
        organizationId,
        authRole: "admin",
      });
      notify.success(
        `Pontuação atualizada. ${result.recommendationsCreated} recomendações sincronizadas.`,
      );
      await fetchSnapshot();
    } catch (e: unknown) {
      notify.error(describeError(e, "Falha ao reprocessar."));
    } finally {
      setReprocessLoading(false);
    }
  }

  const snapshot = data?.snapshot;
  const ready = Boolean(effectiveFormId && (organizationId || isGlobalView));

  const orgName = isGlobalView
    ? "Todas as organizações"
    : (filters?.organizations.find((o) => o.id === organizationId)?.name ?? "");

  function handleExportCsv() {
    if (!snapshot || mode !== "admin") return;
    const rows: string[] = [
      "Escopo;Nome;Percentual;Nivel;Pontos obtidos;Pontos possiveis",
      `Global;Global;${snapshot.global?.percentage.toFixed(2) ?? ""};${
        snapshot.global?.maturityLevel ?? ""
      };${snapshot.global?.pointsObtained.toFixed(2) ?? ""};${
        snapshot.global?.pointsPossible.toFixed(2) ?? ""
      }`,
      ...snapshot.axes.map(
        (a) =>
          `Eixo;${escapeCsv(a.axisName)};${a.percentage.toFixed(2)};${a.maturityLevel};;`,
      ),
      ...snapshot.sections.map(
        (s) =>
          `Secao;${escapeCsv(s.sectionName)};${s.percentage.toFixed(2)};${s.maturityLevel};${s.pointsObtained.toFixed(2)};${s.pointsPossible.toFixed(2)}`,
      ),
    ];
    const csv = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const scopeSlug = isGlobalView ? "geral" : orgName || "organizacao";
    const versionSuffix = isGlobalView ? "agregado" : `v${snapshot.processingVersion}`;
    a.download = `fami-${scopeSlug}-${versionSuffix}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  const evolutionByYear = data?.evolutionByYear ?? [];
  const delta = useMemo(() => {
    if (isGlobalView) {
      return evolutionDelta([]);
    }
    return evolutionDeltaByYear(evolutionByYear);
  }, [evolutionByYear, isGlobalView]);

  const adminInsights = useMemo(() => {
    if (mode !== "admin" || !snapshot) return null;
    return interpretSnapshot(snapshot);
  }, [mode, snapshot]);

  const axesRanked = useMemo(
    () => (mode === "admin" && snapshot ? rankAxesByImpact(snapshot.axes) : []),
    [mode, snapshot],
  );

  const queueScope = useMemo(
    () => ({
      globalView: isGlobalView,
      organizationId: organizationId || "",
    }),
    [organizationId, isGlobalView],
  );

  function queueHref(
    segment: "evidencias" | "recomendacoes" | "plano-acao",
    params: Record<string, string>,
  ): string | null {
    if (mode === "respondent" || !organizationId || !effectiveFormId) return null;
    return staffQueueHref("admin", segment, queueScope, params);
  }

  const adminInsightSummary = adminInsights?.summary.replace(
    /^Sua maturidade/,
    "A maturidade",
  );

  const modeLabel = mode === "admin" ? "Administrador" : "Respondente";

  const heroSummaryLine = useMemo(() => {
    if (!snapshot?.global) return null;
    const scopeLabel = isGlobalView
      ? "visão geral entre organizações"
      : orgName || "organização selecionada";
    return `Nível ${snapshot.global.maturityLevel} · ${snapshot.global.percentage.toFixed(1)}% de maturidade · ${scopeLabel}.`;
  }, [snapshot, isGlobalView, orgName]);

  const heroSummaryClass =
    snapshot?.global && !loading
      ? snapshot.global.percentage < 50
        ? "text-amber-900"
        : "text-slate-700"
      : "text-slate-600";

  const modeBadge = (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-micro font-semibold uppercase tracking-wide text-slate-600 shadow-sm"
      title="Perfil de acesso"
    >
      <Sparkles className="h-3.5 w-3.5 text-brand" aria-hidden />
      {modeLabel}
    </span>
  );

  return (
    <section className={FAMI_SECTION_STACK}>
      {mode === "respondent" ? null : (
        <div className={ADMIN_PAGE_HERO_BLEED}>
          <AdminFamiMaturityHero
            summaryLine={heroSummaryLine}
            summaryClassName={heroSummaryClass}
            loading={loading}
            reprocessLoading={reprocessLoading}
            ready={ready}
            reprocessDisabled={isGlobalView}
            reprocessTitle={
              isGlobalView
                ? "Selecione uma organização específica para reprocessar."
                : undefined
            }
            exportDisabled={!snapshot}
            onRefresh={() => void fetchSnapshot()}
            onExport={() => handleExportCsv()}
            onReprocess={() => void handleReprocess()}
          />
        </div>
      )}

      <PanelSection
        title="Escopo da maturidade"
        description="Selecione organização e formulário para analisar indicadores e evolução."
        variant="card"
        actions={modeBadge}
        contentClassName="space-y-5"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {mode === "admin" ? (
              <div className={`min-w-0 ${formSurface.fieldGroup}`}>
                <label htmlFor="fami-organization" className={formSurface.label}>
                  Organizacao
                </label>
                <select
                  id="fami-organization"
                  value={organizationId}
                  onChange={(e) => setOrganizationId(e.target.value)}
                  className={formSurface.inputSelect}
                  aria-describedby="fami-organization-hint"
                >
                  <option value="">{ALL_ORGS_LABEL}</option>
                  {filters?.organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <p
                  id="fami-organization-hint"
                  className="text-micro leading-relaxed text-slate-500"
                >
                  {isGlobalView
                    ? "Visão agregada: percentuais por eixo/seção são médias entre organizações; pontos são somados."
                    : "Selecione uma organização específica ou escolha “Geral” para ver o agregado."}
                </p>
              </div>
            ) : (
              <div className={`min-w-0 ${formSurface.fieldGroup}`}>
                <p className={formSurface.label}>Organizacao</p>
                <div className={formSurface.readOnlyField}>
                  {organizationId ? (
                    <span className="text-slate-800">
                      {filters?.organizations.find((o) => o.id === organizationId)?.name ?? "—"}
                    </span>
                  ) : (
                    <span className="text-rose-600">Perfil sem organizacao vinculada.</span>
                  )}
                </div>
              </div>
            )}
            <div className={`min-w-0 ${formSurface.fieldGroup}`}>
              <label htmlFor="fami-form" className={formSurface.label}>
                Formulario
              </label>
              <select
                id="fami-form"
                value={filters?.forms.length ? effectiveFormId : ""}
                onChange={(e) => setFormId(e.target.value)}
                className={formSurface.inputSelect}
                disabled={!filters?.forms.length}
              >
                {filters?.forms.length ? (
                  filters.forms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (v{f.version})
                    </option>
                  ))
                ) : (
                  <option value="">Carregando formularios…</option>
                )}
              </select>
            </div>
            {!isGlobalView ? (
              <YearSelect
                id="fami-snapshot-year-shell"
                label="Ano da pontuação"
                hint="Último processamento no ano civil (BRT). Vazio = situação atual."
                years={data?.availableYears ?? []}
                value={snapshotYearFilter}
                onChange={(y) => setSnapshotYearFilter(y)}
                disabled={loading}
              />
            ) : null}
          </div>

          {!isGlobalView && data?.latestVersionMeta?.createdAt ? (
            <p className="text-xs text-slate-500" role="status">
              Última atualização da pontuação:{" "}
              <time
                className="font-medium text-slate-700"
                dateTime={data.latestVersionMeta.createdAt}
              >
                {formatFamiUpdatedAt(data.latestVersionMeta.createdAt)}
              </time>
            </p>
          ) : null}

          {isGlobalView ? (
            <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-sm text-sky-900">
              Visão Geral: agregando o último processamento FAMI de cada organização com dados para este formulário.
            </p>
          ) : null}
        </div>
      </PanelSection>

      <FamiMaturitySectionBreak />

      <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding} py-4 sm:py-5`}>
        <SegmentedTabs<TabId>
          variant="bare"
          aria-label="Vistas do FAMI"
          value={tab}
          onChange={setTab}
          items={[
            { id: "resumo", label: "Resumo" },
            { id: "secoes", label: "Por secao" },
            {
              id: "evolucao",
              label: "Evolucao",
              title: isGlobalView
                ? "Evolução por versão de processamento requer uma organização específica."
                : undefined,
            },
          ]}
        />
      </div>

      {!ready ? (
        <div className={`${formSurface.messageNeutral} border-dashed px-5 py-8 sm:px-6`}>
          {mode === "respondent"
            ? "Aguarde o carregamento dos formularios ou selecione um formulario valido para ver o FAMI."
            : "Selecione a organizacao (se for o caso) e aguarde os formularios para ver o FAMI."}
        </div>
      ) : loading ? (
        <div className={`${formSurface.nestedCard} animate-pulse px-5 py-10 text-sm text-slate-500 sm:px-6`}>
          Carregando indicadores…
        </div>
      ) : !snapshot ? (
        <div className={`${formSurface.messageNeutral} border-dashed px-5 py-8 sm:px-6`}>
          {!isGlobalView && snapshotYearFilter != null
            ? `Nenhum processamento FAMI de fechamento em ${snapshotYearFilter}. Experimente “Todos os anos”.`
            : isGlobalView
              ? "Nenhum processamento FAMI encontrado para este formulario em nenhuma organizacao."
              : "Nenhum processamento FAMI encontrado para este formulario e organizacao."}
          {mode === "respondent"
            ? " A maturidade aparece apos o processamento das respostas e validacoes."
            : " Use Reprocessar FAMI ou abrir Validacoes apos respostas e validacoes."}
        </div>
      ) : tab === "resumo" && mode === "admin" ? (
        <div className={FAMI_SECTION_STACK}>
          {snapshot.global ? (
            <PanelSection
              title="Indicadores executivos"
              description="Consolidado de maturidade, nível institucional e evolução do escopo selecionado."
              variant="card"
              contentClassName="pt-1"
            >
              <div className={FAMI_KPI_GRID}>
                <MetricCard
                  density="comfortable"
                  variant="default"
                  label="Maturidade global"
                  icon={Percent}
                  value={`${snapshot.global.percentage.toFixed(1)}%`}
                  secondary={`${snapshot.global.pointsObtained.toFixed(2)} / ${snapshot.global.pointsPossible.toFixed(2)} pts`}
                />
                <MetricCard
                  density="comfortable"
                  variant="info"
                  label="Nível institucional"
                  icon={Layers}
                  value={`Nível ${snapshot.global.maturityLevel}`}
                  secondary="Escala 1–5 conforme faixas do FAMI"
                />
                <MetricCard
                  density="comfortable"
                  variant="neutral"
                  label="Última atualização"
                  icon={Clock}
                  value={
                    data?.latestVersionMeta?.createdAt
                      ? formatFamiUpdatedAt(data.latestVersionMeta.createdAt)
                      : "—"
                  }
                  secondary={
                    isGlobalView
                      ? "Agregado entre organizações"
                      : "Atualização automática após respostas e validações"
                  }
                />
                {isGlobalView ? (
                  <MetricCard
                    density="comfortable"
                    variant="neutral"
                    label="Escopo"
                    icon={Layers}
                    value="Geral"
                    secondary="Média entre organizações com FAMI neste formulário"
                  />
                ) : (
                  <MetricCard
                    density="comfortable"
                    variant={
                      delta.trend === "up"
                        ? "success"
                        : delta.trend === "down"
                          ? "danger"
                          : "neutral"
                    }
                    label="Vs. ciclo anterior"
                    icon={TREND_META[delta.trend].icon}
                    value={
                      delta.delta != null
                        ? `${delta.delta > 0 ? "+" : ""}${delta.delta.toFixed(1)} p.p.`
                        : "—"
                    }
                    secondary={TREND_META[delta.trend].label}
                  />
                )}
              </div>
            </PanelSection>
          ) : (
            <p className={`${formSurface.messageNeutral} border-dashed text-sm`}>
              Snapshot sem agregado global; verifique barras por eixo ou reprocessamento.
            </p>
          )}

          {organizationId && effectiveFormId && mode === "admin" ? (
            <nav
              className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-card"
              aria-label="Atalhos operacionais"
            >
              <Link
                href={queueHref("evidencias", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Fila de evidências
              </Link>
              <Link
                href={queueHref("recomendacoes", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Recomendações deste formulário
              </Link>
              <Link
                href={queueHref("plano-acao", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Plano de ação
              </Link>
            </nav>
          ) : null}

          <FamiMaturitySectionBreak />

          <PanelSection
            title="Análise visual"
            description="Distribuição de maturidade por eixo — radar comparativo e percentuais consolidados."
            variant="card"
            contentClassName="p-0"
          >
            <div className="grid gap-6 p-6 sm:p-8 xl:grid-cols-2">
              <div className="min-h-88 rounded-xl border border-slate-200/80 bg-slate-50/30 p-4 sm:p-5">
                <RespondentFamiRadarChart
                  embedded
                  axes={snapshot.axes}
                  title="Radar de eixos"
                />
              </div>
              <div className="flex min-h-88 flex-col rounded-xl border border-slate-200/80 bg-white p-5 sm:p-6">
                <p className={formSurface.label}>Percentual por eixo</p>
                <div className="mt-5 min-h-72 flex-1">
                  <AxisBarChart data={snapshot.axes} />
                </div>
              </div>
            </div>
          </PanelSection>

          {adminInsights && adminInsightSummary ? (
            <>
              <FamiMaturitySectionBreak />
              <FamiMaturityExecutiveInsights
                summary={adminInsightSummary}
                cards={adminInsights.cards}
              />
            </>
          ) : null}

          {axesRanked.length > 0 ? (
            <>
              <FamiMaturitySectionBreak />
              <PanelSection
                title="Maior ganho potencial"
                description="Eixos ordenados pelo impacto estimado sobre a pontuação global se atingirem 100%."
                variant="card"
                contentClassName="p-0"
              >
                <ul className="divide-y divide-slate-100">
                  {axesRanked.slice(0, 6).map((row) => {
                    const href =
                      mode === "admin" && organizationId && effectiveFormId && row.axisId
                        ? staffQueueHref("admin", "recomendacoes", queueScope, {
                            formId: effectiveFormId,
                            axisId: row.axisId,
                          })
                        : null;
                    return (
                      <li
                        key={row.axisId ?? row.axisName}
                        className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6 sm:py-5"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-slate-900">{row.axisName}</p>
                          <p className={`mt-1 ${typography.meta}`}>
                            {row.percentage.toFixed(1)}% · Nível {row.level} · impacto até{" "}
                            {row.impact.toFixed(1)} p.p.
                          </p>
                        </div>
                        {href ? (
                          <Link
                            href={href}
                            className="shrink-0 text-xs font-semibold text-brand-800 hover:underline"
                          >
                            Abrir recomendações
                          </Link>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </PanelSection>
            </>
          ) : null}

          <FamiMaturitySectionBreak />

          <PanelSection
            title="Detalhe por eixo"
            description="Leitura estratégica da maturidade em cada dimensão do formulário."
            variant="card"
          >
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.axes.map((axis) => {
                const showDrill = Boolean(
                  mode === "admin" && organizationId && effectiveFormId && axis.axisId,
                );
                const drillHref =
                  showDrill && axis.axisId && mode === "admin"
                    ? staffQueueHref("admin", "recomendacoes", queueScope, {
                        formId: effectiveFormId,
                        axisId: axis.axisId,
                      })
                    : undefined;
                return (
                  <FamiMaturityAxisCard
                    key={axis.axisId ?? axis.axisName}
                    axisName={axis.axisName}
                    percentage={axis.percentage}
                    maturityLevel={axis.maturityLevel}
                    drillHref={drillHref || undefined}
                  />
                );
              })}
            </div>
          </PanelSection>
        </div>
      ) : tab === "resumo" ? (
        <div className={FAMI_SECTION_STACK}>
          {organizationId && effectiveFormId && mode === "admin" ? (
            <nav
              className="flex flex-wrap gap-x-6 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-5 py-4 shadow-card"
              aria-label="Atalhos operacionais"
            >
              <Link
                href={queueHref("evidencias", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Fila de evidências
              </Link>
              <Link
                href={queueHref("recomendacoes", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Recomendações deste formulário
              </Link>
              <Link
                href={queueHref("plano-acao", { formId: effectiveFormId }) ?? "#"}
                className={typography.inlineNavLink}
              >
                Plano de ação
              </Link>
            </nav>
          ) : null}

          {snapshot.global ? (
            <PanelSection
              title="Visão global"
              description="Consolidado de maturidade no escopo selecionado."
              variant="card"
            >
              <p className="text-3xl font-semibold tracking-tight text-slate-900">
                {snapshot.global.percentage.toFixed(1)}%
              </p>
              <p className="mt-2 text-sm text-slate-600">
                Nivel {snapshot.global.maturityLevel} · Pontos{" "}
                {snapshot.global.pointsObtained.toFixed(2)} /{" "}
                {snapshot.global.pointsPossible.toFixed(2)} pontos possíveis
              </p>
              {data?.latestVersionMeta?.createdAt ? (
                <p className="mt-3 text-xs text-slate-500">
                  Processado em{" "}
                  {new Date(data.latestVersionMeta.createdAt).toLocaleString("pt-BR")}
                </p>
              ) : null}
            </PanelSection>
          ) : null}

          <PanelSection
            title="Análise por eixo"
            description="Distribuição percentual da maturidade em cada dimensão."
            variant="card"
            contentClassName="space-y-6"
          >
            <div className="min-h-80 rounded-xl border border-slate-200/80 bg-slate-50/30 p-5 sm:p-6">
              <AxisBarChart data={snapshot.axes} />
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {snapshot.axes.map((axis) => {
                const showDrill = Boolean(
                  mode === "admin" && organizationId && effectiveFormId && axis.axisId,
                );
                const drillHref =
                  showDrill && axis.axisId && mode === "admin"
                    ? staffQueueHref("admin", "recomendacoes", queueScope, {
                        formId: effectiveFormId,
                        axisId: axis.axisId,
                      })
                    : undefined;
                return (
                  <FamiMaturityAxisCard
                    key={axis.axisId ?? axis.axisName}
                    axisName={axis.axisName}
                    percentage={axis.percentage}
                    maturityLevel={axis.maturityLevel}
                    drillHref={drillHref}
                  />
                );
              })}
            </div>
          </PanelSection>
        </div>
      ) : tab === "secoes" ? (
        <PanelSection
          title="Detalhamento por seção"
          description="Percentual, nível e pontuação de cada seção do formulário."
          variant="card"
          contentClassName="overflow-hidden p-0"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
              <tr>
                <th className="px-5 py-4 sm:px-6">Secao</th>
                <th className="px-5 py-4 sm:px-6">%</th>
                <th className="px-5 py-4 sm:px-6">Nivel</th>
                <th className="px-5 py-4 sm:px-6">Pontos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {snapshot.sections.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-500 sm:px-6">
                    Sem dados por secao nesta versao.
                  </td>
                </tr>
              ) : (
                snapshot.sections.map((s) => (
                  <tr key={s.sectionId} className="bg-white/80">
                    <td className="px-5 py-3.5 font-medium text-slate-800 sm:px-6">{s.sectionName}</td>
                    <td className="px-5 py-3.5 text-slate-700 sm:px-6">{s.percentage.toFixed(1)}%</td>
                    <td className="px-5 py-3.5 text-slate-700 sm:px-6">{s.maturityLevel}</td>
                    <td className="px-5 py-3.5 text-slate-600 sm:px-6">
                      {s.pointsObtained.toFixed(2)} / {s.pointsPossible.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </PanelSection>
      ) : isGlobalView ? (
        <PanelSection
          title="Evolução temporal"
          description="Comparativo entre ciclos de processamento FAMI."
          variant="card"
        >
          <p className={`${formSurface.messageNeutral} border-dashed text-sm`}>
            Evolução anual requer uma organização específica (versões não são comparáveis na visão
            Geral).
          </p>
        </PanelSection>
      ) : (
        <PanelSection
          title="Evolução temporal"
          description="Comparativo entre ciclos de processamento FAMI."
          variant="card"
          contentClassName="p-5 sm:p-6"
        >
          <div className="min-h-88">
            <FamiEvolutionChart variant="years" data={data?.evolutionByYear ?? []} />
          </div>
        </PanelSection>
      )}

      <FamiMaturitySectionBreak />

      <FamiMethodologyGuide currentLevel={snapshot?.global?.maturityLevel ?? null} />
    </section>
  );
}

function escapeCsv(value: string): string {
  return value.replace(/;/g, ",").replace(/\n/g, " ");
}
