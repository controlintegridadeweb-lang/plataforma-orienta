"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { TableSkeleton } from "@/components/ui/loading";
import { notify } from "@/lib/notify";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { recommendationTypeLabel, workflowStatusLabel } from "@/lib/domain/status-registry";
import {
  STATUS_META,
  summarize,
  type AdminRecommendationItem,
  type AdminRecommendationView as ExtendedStatusView,
} from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationEmptyState } from "./admin-recommendation-empty-state";
import {
  AdminRecommendationFilters,
  initialAdminFilters,
  type AdminFiltersState,
} from "./admin-recommendation-filters";
import { AdminRecommendationList } from "./admin-recommendation-list";
import { AdminRecommendationOrganizationView } from "./admin-recommendation-organization-view";
import {
  AdminRecommendationSummaryCards,
  type AdminRecommendationSummaryFilter,
} from "./admin-recommendation-summary-cards";
import {
  AdminRecommendationViewSwitcher,
  type AdminRecommendationView as ViewMode,
} from "./admin-recommendation-view-switcher";
import { AdminRecommendationsHero } from "./admin-recomendacoes-hero";
import { useAdminRecommendations } from "./hooks/use-admin-recommendations";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { useStaffListUrlSync } from "@/lib/hooks/use-staff-list-url-sync";
import { parseStaffListLayout, parseStaffListUrlFilters } from "@/lib/staff-list-url";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";

type InitialFilters = Partial<AdminFiltersState>;

type Props = {
  initialFilters?: InitialFilters;
};

const PAGE_SIZE = 24;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function applyFilters(
  items: AdminRecommendationItem[],
  filters: AdminFiltersState,
  searchDebounced: string,
  cardFilter: AdminRecommendationSummaryFilter,
  axisIdToName: Map<string, string>,
): AdminRecommendationItem[] {
  return items.filter((it) => {
    if (filters.organizationId && it.organizationId !== filters.organizationId) return false;
    if (filters.formId && it.formId !== filters.formId) return false;
    if (filters.axisId) {
      const axisName = axisIdToName.get(filters.axisId);
      if (axisName && it.axisName && it.axisName !== axisName) return false;
    }
    if (filters.view && it.view !== filters.view) return false;
    if (cardFilter === "without_plan" && it.hasPlan) return false;
    if (cardFilter === "in_execution" && it.view !== "in_execution") return false;
    if (cardFilter === "completed" && it.view !== "completed") return false;
    if (cardFilter === "overdue" && !it.isOverdue) return false;

    if (filters.from || filters.to) {
      const ref = it.updatedAt ? new Date(it.updatedAt) : null;
      if (ref) {
        if (filters.from && ref < new Date(filters.from)) return false;
        if (filters.to && ref > new Date(`${filters.to}T23:59:59`)) return false;
      }
    }

    if (searchDebounced.trim()) {
      const q = normalize(searchDebounced);
      const hay = normalize(
        [
          it.recommendationText,
          it.questionPrompt,
          it.axisName,
          it.sectionName,
          it.organizationName,
          it.formName,
          it.responsibleName,
        ].join(" "),
      );
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function downloadCsv(rows: AdminRecommendationItem[]) {
  const header = [
    "Organização",
    "Formulário",
    "Versão",
    "Eixo",
    "Seção",
    "Pergunta",
    "Recomendação",
    "Tipo",
    "Status (admin)",
    "Plano?",
    "Status plano",
    "Responsável",
    "Setor",
    "Prazo",
    "Atualizado em",
    "Atrasado",
    "% execução",
  ];
  const escape = (v: unknown): string => {
    const s = v == null ? "" : String(v);
    if (/[",;\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [header.join(";")];
  for (const it of rows) {
    lines.push(
      [
        it.organizationName,
        it.formName,
        it.formVersion,
        it.axisName,
        it.sectionName,
        it.questionPrompt,
        it.recommendationText,
        recommendationTypeLabel(it.recommendationType),
        STATUS_META[it.view].label,
        it.hasPlan ? "Sim" : "Não",
        it.planStatus ? workflowStatusLabel("action_plan", it.planStatus) : "",
        it.responsibleName,
        it.responsibleSector,
        it.dueDate ?? "",
        it.updatedAt ?? "",
        it.isOverdue ? "Sim" : "Não",
        it.progress,
      ]
        .map(escape)
        .join(";"),
    );
  }
  const csv = `\ufeff${lines.join("\n")}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `recomendacoes-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminRecommendationsShell({
  initialFilters,
}: Props = {}) {
  const pathname = usePathname() ?? "";
  const reportHref = pathname.startsWith("/analista")
    ? "/analista/relatorios?focus=recomendacoes"
    : "/admin/relatorios?focus=recomendacoes";

  const { items, filterOptions, loading, error, refetch } = useAdminRecommendations();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<AdminFiltersState>(() => {
    const url = parseStaffListUrlFilters(new URLSearchParams(searchParams.toString()), {
      includeAxis: true,
    });
    return {
      ...initialAdminFilters,
      ...(initialFilters ?? {}),
      ...(url.search !== undefined ? { search: url.search } : {}),
      ...(url.organizationId !== undefined ? { organizationId: url.organizationId } : {}),
      ...(url.formId !== undefined ? { formId: url.formId } : {}),
      ...(url.axisId !== undefined ? { axisId: url.axisId } : {}),
      ...(url.from !== undefined ? { from: url.from } : {}),
      ...(url.to !== undefined ? { to: url.to } : {}),
      view: (url.status ?? initialFilters?.view ?? "") as AdminFiltersState["view"],
    };
  });
  const [cardFilter, setCardFilter] = useState<AdminRecommendationSummaryFilter>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() =>
    parseStaffListLayout(new URLSearchParams(searchParams.toString())),
  );
  const [page, setPage] = useState(0);

  const searchDebounced = useDebounce(filters.search, 250);

  useStaffListUrlSync({
    layout: viewMode,
    debouncedSearch: searchDebounced,
    includeAxis: true,
    filters: {
      search: filters.search,
      organizationId: filters.organizationId,
      formId: filters.formId,
      axisId: filters.axisId,
      status: filters.view,
      from: filters.from,
      to: filters.to,
    },
  });

  const axisIdToName = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of filterOptions?.axes ?? []) map.set(a.id, a.name);
    return map;
  }, [filterOptions]);

  const summaryFiltered = useMemo(() => {
    return applyFilters(items, filters, searchDebounced, null, axisIdToName);
  }, [items, filters, searchDebounced, axisIdToName]);

  const filteredItems = useMemo(() => {
    return applyFilters(items, filters, searchDebounced, cardFilter, axisIdToName);
  }, [items, filters, searchDebounced, cardFilter, axisIdToName]);

  const summary = useMemo(() => summarize(summaryFiltered), [summaryFiltered]);

  useEffect(() => {
    setPage(0);
  }, [filters, searchDebounced, cardFilter, viewMode]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    notify.success("Recomendações atualizadas.");
  }, [refetch]);

  const handleExport = useCallback(() => {
    if (filteredItems.length === 0) {
      notify.warning("Não há recomendações para exportar com os filtros atuais.");
      return;
    }
    downloadCsv(filteredItems);
    notify.success("Exportação concluída.");
  }, [filteredItems]);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...initialAdminFilters });
    setCardFilter(null);
  }, []);

  if (loading && items.length === 0) {
    return <TableSkeleton rows={6} cols={4} />;
  }
  if (error) {
    return <p className={formSurface.messageError}>{error}</p>;
  }
  if (items.length === 0) {
    return (
      <div className={layout.pageStack}>
        <div className={ADMIN_PAGE_HERO_BLEED}>
          <AdminRecommendationsHero
            summary={null}
            onRefresh={() => void handleRefresh()}
            onExport={handleExport}
            reportHref={reportHref}
          />
        </div>
        <AdminRecommendationEmptyState kind="none" />
      </div>
    );
  }

  const isPaginated = viewMode === "list";
  const paged = isPaginated
    ? filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : filteredItems;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminRecommendationsHero
          summary={summary}
          loading={loading}
          onRefresh={() => void handleRefresh()}
          onExport={handleExport}
          reportHref={reportHref}
        />
      </div>

      <div className={`${layout.panelStack} gap-5 pt-1`}>
        <AdminRecommendationSummaryCards
          summary={summary}
          activeFilter={cardFilter}
          onSelect={(next) => setCardFilter(cardFilter === next ? null : next)}
        />

        <AdminRecommendationFilters
          value={filters}
          organizations={(filterOptions?.organizations ?? []).map((o) => ({
            id: o.id,
            label: o.name,
          }))}
          forms={(filterOptions?.forms ?? []).map((f) => ({
            id: f.id,
            label: `${f.name} (v${f.version})`,
          }))}
          axes={(filterOptions?.axes ?? []).map((a) => ({ id: a.id, label: a.name }))}
          onChange={setFilters}
        />

        <section className={layout.sectionStack}>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <AdminRecommendationViewSwitcher value={viewMode} onChange={setViewMode} />
            <p className={`${typography.meta} sm:text-right`}>
              <span className="font-semibold tabular-nums text-slate-800">
                {filteredItems.length}
              </span>{" "}
              de <span className="tabular-nums text-slate-600">{items.length}</span> no escopo
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <AdminRecommendationEmptyState kind="no-results" onClear={handleClearFilters} />
          ) : viewMode === "list" ? (
            <>
              <AdminRecommendationList items={paged} />
              {totalPages > 1 ? (
                <nav
                  className={`flex items-center justify-between px-4 py-3 text-xs text-slate-600 ${formSurface.dashboardPanel}`}
                  aria-label="Paginação"
                >
                  <span className="tabular-nums">
                    Página{" "}
                    <span className="font-semibold text-slate-900">{page + 1}</span> de{" "}
                    <span className="font-semibold text-slate-900">{totalPages}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={page === 0}
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      className={`${formSurface.secondaryButtonSm} text-xs disabled:opacity-50`}
                    >
                      Anterior
                    </button>
                    <button
                      type="button"
                      disabled={page + 1 >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                      className={`${formSurface.secondaryButtonSm} text-xs disabled:opacity-50`}
                    >
                      Próxima
                    </button>
                  </div>
                </nav>
              ) : null}
            </>
          ) : (
            <AdminRecommendationOrganizationView items={filteredItems} />
          )}
        </section>
      </div>
    </div>
  );
}

export type { ExtendedStatusView };
