"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PanelSection } from "@/components/ui/panel-section";
import { layout, typography } from "@/lib/layout/design-system";
import { formSurface } from "@/lib/layout/form-surface";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { describeError, notify } from "@/lib/notify";
import {
  RESPONDENT_VIEW_META,
  type RespondentRecommendationItem,
} from "@/lib/recommendations/respondent-presentation";
import { useRespondentRecommendations } from "./hooks/use-respondent-recommendations";
import { RespondentRecommendationList } from "./respondent-recommendation-list";
import {
  RespondentRecommendationEmptyState,
  type EmptyVariant,
} from "./respondent-recommendation-empty-state";
import {
  RespondentRecommendationFilters,
  type RespondentRecommendationFilterValue,
} from "./respondent-recommendation-filters";
import {
  RespondentRecommendationSummaryCards,
  type SummaryCardKey,
} from "./respondent-recommendation-summary-cards";
import { RespondentRecommendationsHero } from "./respondent-recommendations-hero";
import { RESPONDENT_PAGE_HERO_BLEED } from "@/lib/layout/respondent-page-layout";

const INITIAL_FILTER: RespondentRecommendationFilterValue = {
  search: "",
  view: "",
  formId: "",
  axisName: "",
  withPlan: "all",
  pendingOnly: false,
};

function matchesText(item: RespondentRecommendationItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.recommendationText} ${item.axisName} ${item.sectionName} ${item.formName} ${item.questionPrompt}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function applyFilters(
  rows: RespondentRecommendationItem[],
  f: RespondentRecommendationFilterValue,
  debouncedSearch: string,
): RespondentRecommendationItem[] {
  return rows.filter((item) => {
    if (debouncedSearch && !matchesText(item, debouncedSearch.trim())) return false;
    if (f.view && item.view !== f.view) return false;
    if (f.formId && item.formId !== f.formId) return false;
    if (f.axisName && item.axisName !== f.axisName) return false;
    if (f.withPlan === "with" && !item.hasPlan) return false;
    if (f.withPlan === "without" && item.hasPlan) return false;
    if (f.pendingOnly && !item.needsAction) return false;
    return true;
  });
}

function summaryKeyToFilterPatch(
  key: SummaryCardKey,
): Partial<RespondentRecommendationFilterValue> | null {
  switch (key) {
    case "total":
      return null;
    case "in_progress":
      return { view: "in_progress" };
    case "resolved":
      return { view: "resolved" };
    case "awaiting_action":
      return { view: "awaiting_action", pendingOnly: true };
  }
}

function filterToActiveSummaryKey(
  f: RespondentRecommendationFilterValue,
): SummaryCardKey | null {
  const noOtherFilters =
    !f.formId && !f.axisName && f.withPlan === "all" && !f.search.trim();
  if (f.pendingOnly && f.view === "awaiting_action" && noOtherFilters) {
    return "awaiting_action";
  }
  if (f.view && noOtherFilters && !f.pendingOnly) {
    if (f.view === "in_progress") return "in_progress";
    if (f.view === "resolved") return "resolved";
  }
  if (
    !f.view &&
    !f.formId &&
    !f.axisName &&
    f.withPlan === "all" &&
    !f.pendingOnly &&
    !f.search.trim()
  ) {
    return "total";
  }
  return null;
}

function csvEscape(value: string | number | null | undefined): string {
  const v = value == null ? "" : String(value);
  if (/[";\n\r,]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function downloadCsv(rows: RespondentRecommendationItem[]) {
  const header = [
    "Status",
    "Eixo",
    "Seção",
    "Formulário",
    "Recomendação",
    "Pergunta",
    "Qtd. ações",
    "Status da ação em foco",
    "Responsável",
    "Prazo",
    "Progresso",
  ];
  const body = rows.map((r) =>
    [
      RESPONDENT_VIEW_META[r.view].label,
      r.axisName,
      r.sectionName,
      r.formName,
      r.recommendationText,
      r.questionPrompt,
      `${r.actionCount}`,
      r.plan?.status ?? "",
      r.plan?.responsibleName ?? "",
      r.plan?.dueDate ?? "",
      `${r.progress}%`,
    ]
      .map(csvEscape)
      .join(";"),
  );
  const blob = new Blob([`\ufeff${header.join(";")}\n${body.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `portfolio-recomendacoes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function RespondentRecommendationsShell() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    rows,
    summary,
    loading,
    error,
    formOptions,
    axisOptions,
    refetch,
  } = useRespondentRecommendations();

  const [filter, setFilter] = useState<RespondentRecommendationFilterValue>(INITIAL_FILTER);
  const debouncedSearch = useDebounce(filter.search, 250);

  const filteredRows = useMemo(
    () => applyFilters(rows, filter, debouncedSearch),
    [rows, filter, debouncedSearch],
  );

  const activeSummaryKey = useMemo(() => filterToActiveSummaryKey(filter), [filter]);

  useEffect(() => {
    const id = searchParams.get("recommendationId")?.trim();
    if (id) {
      router.replace(`/respondente/plano-acao/${id}/acoes`);
      return;
    }

    const viewParam = searchParams.get("view")?.trim();
    const formIdParam = searchParams.get("formId")?.trim() ?? "";
    const validViews = [
      "awaiting_action",
      "in_progress",
      "resolved",
      "dismissed",
    ] as const;
    const view =
      viewParam && validViews.includes(viewParam as (typeof validViews)[number])
        ? (viewParam as (typeof validViews)[number])
        : "";

    if (!view && !formIdParam) return;

    setFilter((prev) => ({
      ...INITIAL_FILTER,
      view: view || prev.view,
      formId: formIdParam || prev.formId,
      pendingOnly: view === "awaiting_action",
    }));
  }, [searchParams, router]);

  const handleFilterChange = useCallback((next: RespondentRecommendationFilterValue) => {
    setFilter(next);
  }, []);

  const handleClear = useCallback(() => setFilter(INITIAL_FILTER), []);

  const handleSummarySelect = useCallback(
    (key: SummaryCardKey) => {
      const patch = summaryKeyToFilterPatch(key);
      if (!patch) {
        setFilter(INITIAL_FILTER);
        return;
      }
      setFilter({ ...INITIAL_FILTER, ...patch });
    },
    [],
  );

  async function handleRefresh() {
    try {
      await refetch();
    } catch (e) {
      notify.error(describeError(e, "Falha ao atualizar."));
    }
  }

  function handleExport() {
    if (filteredRows.length === 0) {
      notify.info("Nenhuma recomendação para exportar.");
      return;
    }
    try {
      downloadCsv(filteredRows);
      notify.success("Exportação iniciada.");
    } catch (e) {
      notify.error(describeError(e, "Falha ao exportar."));
    }
  }

  const hasActiveFilters =
    Boolean(filter.search.trim()) ||
    Boolean(filter.view) ||
    Boolean(filter.formId) ||
    Boolean(filter.axisName) ||
    filter.withPlan !== "all" ||
    filter.pendingOnly;

  const emptyVariant: EmptyVariant | null = (() => {
    if (filteredRows.length > 0) return null;
    if (rows.length === 0) return "no-recommendations";
    if (hasActiveFilters) return "no-results";
    return "no-recommendations";
  })();

  return (
    <div className={layout.pageStack}>
      <div className={RESPONDENT_PAGE_HERO_BLEED}>
        <RespondentRecommendationsHero
          onRefresh={handleRefresh}
          refreshing={loading}
          onExport={handleExport}
        />
      </div>

      <section className={`${layout.panelStack} pt-1`}>
      {error ? <p className={formSurface.messageError}>{error}</p> : null}

      <PanelSection
        title="Indicadores"
        description="Resumo das recomendações. Selecione um cartão para filtrar."
        variant="plain"
      >
        <RespondentRecommendationSummaryCards
          summary={summary}
          loading={loading && rows.length === 0}
          activeKey={activeSummaryKey}
          onSelect={handleSummarySelect}
        />
      </PanelSection>

      <PanelSection title="Filtros" description="Busca, status, formulário e eixo." variant="plain">
      <RespondentRecommendationFilters
        value={filter}
        onChange={handleFilterChange}
        onClear={handleClear}
        forms={formOptions}
        axes={axisOptions}
        resultCount={filteredRows.length}
      />
      </PanelSection>

      <PanelSection
        title="Recomendações"
        description="Lista em cards — status, motivo e próximo passo em destaque. Expanda para ver o texto completo."
        variant="plain"
        contentClassName="space-y-4"
      >
        {filteredRows.length !== summary.total ? (
          <p className={typography.meta}>
            Exibindo{" "}
            <span className="font-medium tabular-nums text-slate-700">{filteredRows.length}</span> de{" "}
            <span className="tabular-nums text-slate-600">{summary.total}</span> recomendações com os
            filtros atuais
          </p>
        ) : null}

        {loading && rows.length === 0 ? (
          <div className="space-y-4" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-xl border border-slate-100 bg-slate-50/80"
              />
            ))}
          </div>
        ) : emptyVariant ? (
          <RespondentRecommendationEmptyState
            variant={emptyVariant}
            onClearFilters={hasActiveFilters ? handleClear : undefined}
          />
        ) : (
          <RespondentRecommendationList items={filteredRows} />
        )}
      </PanelSection>
      </section>
    </div>
  );
}
