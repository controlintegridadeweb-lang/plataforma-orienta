"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { TableSkeleton } from "@/components/ui/loading";
import {
  ActionPlanScopeBanner,
  type ActionPlanScopePart,
} from "@/components/action-plans/action-plan-scope-banner";
import {
  STATUS_META,
  type RespondentActionPlanItem,
} from "@/lib/action-plans/respondent-presentation";
import { PanelSection } from "@/components/ui/panel-section";
import { layout, typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { describeError, notify } from "@/lib/notify";
import { useRespondentActionPlans } from "./hooks/use-respondent-action-plans";
import { RespondentActionPlanBoard } from "./respondent-action-plan-board";
import {
  RespondentActionPlanEmptyState,
  type EmptyVariant,
} from "./respondent-action-plan-empty-state";
import {
  RespondentActionPlanFilters,
  type ActionPlanFilterValue,
} from "./respondent-action-plan-filters";
import { RespondentActionPlanHeader } from "./respondent-action-plan-header";
import {
  RespondentActionPlanSummaryCards,
  type ActionPlanSummaryKey,
} from "./respondent-action-plan-summary-cards";

const INITIAL_FILTER: ActionPlanFilterValue = {
  search: "",
  view: "",
  responsible: "",
  formId: "",
  axisName: "",
  recommendationId: "",
  from: "",
  to: "",
  overdueOnly: false,
  withoutResponsible: false,
};

function matchesText(item: RespondentActionPlanItem, query: string): boolean {
  if (!query) return true;
  const haystack = `${item.title} ${item.description} ${item.recommendationText} ${item.axisName} ${item.sectionName} ${item.formName} ${item.responsibleName} ${item.responsibleSector}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function applyFilters(
  rows: RespondentActionPlanItem[],
  f: ActionPlanFilterValue,
  debouncedSearch: string,
): RespondentActionPlanItem[] {
  return rows.filter((item) => {
    if (debouncedSearch && !matchesText(item, debouncedSearch.trim())) return false;
    if (f.view && item.view !== f.view) return false;
    if (f.responsible.trim()) {
      const term = f.responsible.trim().toLowerCase();
      const haystack = `${item.responsibleName} ${item.responsibleSector}`.toLowerCase();
      if (!haystack.includes(term)) return false;
    }
    if (f.formId && item.formId !== f.formId) return false;
    if (f.axisName && item.axisName !== f.axisName) return false;
    if (
      f.recommendationId.trim() &&
      item.recommendationId !== f.recommendationId.trim()
    ) {
      return false;
    }
    if (f.from && (item.dueDate ?? "") < f.from) return false;
    if (f.to && (item.dueDate ?? "9999-12-31") > f.to) return false;
    if (f.overdueOnly && !item.isOverdue) return false;
    if (f.withoutResponsible && item.hasResponsible) return false;
    return true;
  });
}

function summaryKeyToFilterPatch(key: ActionPlanSummaryKey): Partial<ActionPlanFilterValue> | null {
  switch (key) {
    case "total":
      return null;
    case "not_started":
      return { view: "not_started" };
    case "in_progress":
      return { view: "in_progress" };
    case "completed":
      return { view: "completed" };
    case "overdue":
      return { view: "overdue", overdueOnly: true };
    case "no_plan":
      return { view: "no_plan" };
    case "due_soon":
      return { search: "" };
  }
}

function filterToActiveSummaryKey(f: ActionPlanFilterValue): ActionPlanSummaryKey | null {
  const noOther =
    !f.responsible.trim() &&
    !f.formId &&
    !f.axisName &&
    !f.recommendationId.trim() &&
    !f.from &&
    !f.to &&
    !f.withoutResponsible &&
    !f.search.trim();
  if (noOther && f.view === "overdue" && f.overdueOnly) return "overdue";
  if (noOther && !f.overdueOnly) {
    if (f.view === "not_started") return "not_started";
    if (f.view === "in_progress") return "in_progress";
    if (f.view === "completed") return "completed";
    if (f.view === "no_plan") return "no_plan";
  }
  if (
    !f.view &&
    !f.responsible.trim() &&
    !f.formId &&
    !f.axisName &&
    !f.recommendationId.trim() &&
    !f.from &&
    !f.to &&
    !f.overdueOnly &&
    !f.withoutResponsible &&
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

function downloadCsv(rows: RespondentActionPlanItem[]) {
  const header = [
    "Status",
    "Ação",
    "Recomendação",
    "Eixo",
    "Seção",
    "Formulário",
    "Responsável",
    "Área",
    "Prazo",
    "Progresso",
    "Atualizado em",
  ];
  const body = rows.map((r) =>
    [
      STATUS_META[r.view].label,
      r.description || r.title,
      r.recommendationText,
      r.axisName,
      r.sectionName,
      r.formName,
      r.responsibleName,
      r.responsibleSector,
      r.dueDate ?? "",
      `${r.progress}%`,
      r.updatedAt ?? "",
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
  a.download = `plano-acao-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function RespondentActionPlanShell() {
  const searchParams = useSearchParams();

  const { rows, summary, loading, error, formOptions, axisOptions, refetch } =
    useRespondentActionPlans();

  const [filter, setFilter] = useState<ActionPlanFilterValue>(INITIAL_FILTER);
  const debouncedSearch = useDebounce(filter.search, 250);

  useEffect(() => {
    const fid = searchParams.get("formId") ?? "";
    const rid = searchParams.get("recommendationId") ?? "";
    if (!fid && !rid) return;
    setFilter((prev) => ({
      ...prev,
      ...(fid ? { formId: fid } : {}),
      ...(rid ? { recommendationId: rid } : {}),
    }));
  }, [searchParams]);

  const filteredRows = useMemo(
    () => applyFilters(rows, filter, debouncedSearch),
    [rows, filter, debouncedSearch],
  );

  const activeSummaryKey = useMemo(() => filterToActiveSummaryKey(filter), [filter]);

  const handleFilterChange = useCallback(
    (next: ActionPlanFilterValue) => setFilter(next),
    [],
  );

  const handleClear = useCallback(() => setFilter(INITIAL_FILTER), []);

  const handleSummarySelect = useCallback((key: ActionPlanSummaryKey) => {
    const patch = summaryKeyToFilterPatch(key);
    if (!patch) {
      setFilter(INITIAL_FILTER);
      return;
    }
    if (key === "due_soon") {
      setFilter({
        ...INITIAL_FILTER,
        view: "",
        from: new Date().toISOString().slice(0, 10),
        to: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      });
      return;
    }
    setFilter({ ...INITIAL_FILTER, ...patch });
  }, []);

  async function handleRefresh() {
    try {
      await refetch();
    } catch (e) {
      notify.error(describeError(e, "Falha ao atualizar."));
    }
  }

  function handleExport() {
    if (filteredRows.length === 0) {
      notify.info("Nenhuma ação para exportar.");
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
    Boolean(filter.responsible.trim()) ||
    Boolean(filter.formId) ||
    Boolean(filter.axisName) ||
    Boolean(filter.recommendationId.trim()) ||
    Boolean(filter.from) ||
    Boolean(filter.to) ||
    filter.overdueOnly ||
    filter.withoutResponsible;

  const scopeParts = useMemo((): ActionPlanScopePart[] => {
    const parts: ActionPlanScopePart[] = [];
    if (filter.formId) {
      const form = formOptions.find((f) => f.id === filter.formId);
      parts.push({
        label: "Formulário",
        value: form?.name ?? "Selecionado",
        onClear: () => handleFilterChange({ ...filter, formId: "" }),
      });
    }
    if (filter.axisName) {
      const axis = axisOptions.find((a) => a.value === filter.axisName);
      parts.push({
        label: "Eixo",
        value: axis?.label ?? filter.axisName,
        onClear: () => handleFilterChange({ ...filter, axisName: "" }),
      });
    }
    if (filter.recommendationId.trim()) {
      parts.push({
        label: "Recomendação",
        value: "filtro ativo",
        onClear: () => handleFilterChange({ ...filter, recommendationId: "" }),
      });
    }
    return parts;
  }, [filter, formOptions, axisOptions, handleFilterChange]);

  const emptyVariant: EmptyVariant | null = (() => {
    if (filteredRows.length > 0) return null;
    if (rows.length === 0) return "no-actions";
    if (hasActiveFilters) {
      if (filter.overdueOnly) return "no-overdue";
      if (filter.view === "completed") return "no-completed";
      return "no-results";
    }
    return "no-actions";
  })();

  return (
    <section className={layout.panelStack}>
      <RespondentActionPlanHeader
        onRefresh={handleRefresh}
        refreshing={loading}
        onExport={handleExport}
      />

      {error ? <p className={formSurface.messageError}>{error}</p> : null}

      <PanelSection
        title="Indicadores"
        description="Resumo das suas ações. Clique em um cartão para filtrar."
        variant="plain"
      >
        <RespondentActionPlanSummaryCards
          summary={summary}
          loading={loading && rows.length === 0}
          activeKey={activeSummaryKey}
          onSelect={handleSummarySelect}
        />
      </PanelSection>

      <PanelSection
        title="Filtros"
        description="Refinem o quadro abaixo — formulário, eixo e status na mesma visão."
        variant="plain"
      >
      <RespondentActionPlanFilters
        value={filter}
        onChange={handleFilterChange}
        onClear={handleClear}
        forms={formOptions}
        axes={axisOptions}
        resultCount={filteredRows.length}
      />
      </PanelSection>

      <PanelSection
        title="Plano de ação"
        description="Fluxo por status — uma linha por registro; use os filtros para restringir o escopo."
        variant="plain"
        contentClassName="space-y-4"
      >
        <ActionPlanScopeBanner parts={scopeParts} />

        {filteredRows.length !== rows.length ? (
          <p className={typography.meta}>
            Exibindo{" "}
            <span className="font-medium tabular-nums text-slate-700">{filteredRows.length}</span> de{" "}
            <span className="tabular-nums text-slate-600">{rows.length}</span> ações com os filtros
            atuais
          </p>
        ) : null}

      {loading && rows.length === 0 ? (
          <div className={formSurface.dashboardPanel}>
            <div className={formSurface.dashboardPanelPadding}>
              <TableSkeleton rows={6} cols={3} />
            </div>
          </div>
      ) : emptyVariant ? (
        <RespondentActionPlanEmptyState
          variant={emptyVariant}
          onClearFilters={hasActiveFilters ? handleClear : undefined}
        />
      ) : (
        <RespondentActionPlanBoard items={filteredRows} />
      )}
      </PanelSection>

    </section>
  );
}
