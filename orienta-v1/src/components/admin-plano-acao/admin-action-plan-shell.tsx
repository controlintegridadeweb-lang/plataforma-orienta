"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { TableSkeleton } from "@/components/ui/loading";
import {
  ActionPlanScopeBanner,
  type ActionPlanScopePart,
} from "@/components/action-plans/action-plan-scope-banner";
import { notify } from "@/lib/notify";
import { useDebounce } from "@/lib/hooks/use-debounce";
import {
  STATUS_META,
  summarize,
  type AdminPlanItem,
} from "@/lib/action-plans/admin-monitoring";
import { AdminActionPlanEmptyState } from "./admin-action-plan-empty-state";
import {
  AdminActionPlanFilters,
  initialAdminPlanFilters,
  type AdminPlanFiltersState,
} from "./admin-action-plan-filters";
import { AdminActionPlanHero } from "./admin-plano-acao-hero";
import { AdminActionPlanList } from "./admin-action-plan-list";
import { AdminActionPlanOrganizationView } from "./admin-action-plan-organization-view";
import {
  AdminActionPlanSummaryCards,
  type AdminPlanSummaryFilter,
} from "./admin-action-plan-summary-cards";
import {
  AdminActionPlanViewSwitcher,
  type AdminPlanViewMode,
} from "./admin-action-plan-view-switcher";
import { useAdminActionPlans } from "./hooks/use-admin-action-plans";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/layout/admin-page-layout";
import { useStaffListUrlSync } from "@/lib/hooks/use-staff-list-url-sync";
import { parseStaffListLayout, parseStaffListUrlFilters } from "@/lib/config/staff-list-url";
import { formSurface } from "@/lib/layout/form-surface";
import { layout, typography } from "@/lib/layout/design-system";

type Props = {
  initialFilters?: Partial<AdminPlanFiltersState>;
  initialViewMode?: AdminPlanViewMode;
};

const PAGE_SIZE = 24;

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function applyFilters(
  items: AdminPlanItem[],
  filters: AdminPlanFiltersState,
  searchDebounced: string,
  cardFilter: AdminPlanSummaryFilter,
): AdminPlanItem[] {
  return items.filter((it) => {
    if (filters.organizationId && it.organizationId !== filters.organizationId) return false;
    if (filters.formId && it.formId !== filters.formId) return false;
    if (filters.view && it.view !== filters.view) return false;

    if (filters.from || filters.to) {
      const ref = it.dueDate ? new Date(it.dueDate) : null;
      if (ref) {
        if (filters.from && ref < new Date(filters.from)) return false;
        if (filters.to && ref > new Date(`${filters.to}T23:59:59`)) return false;
      }
    }

    if (cardFilter === "in_progress" && it.view !== "in_progress") return false;
    if (cardFilter === "completed" && it.view !== "completed") return false;
    if (
      cardFilter === "overdue" &&
      !(it.isOverdue || it.view === "critical")
    ) {
      return false;
    }

    if (searchDebounced.trim()) {
      const q = normalize(searchDebounced);
      const hay = normalize(
        [
          it.actionText,
          it.recommendationText,
          it.questionPrompt,
          it.axisName,
          it.sectionName,
          it.organizationName,
          it.formName,
          it.responsibleName,
          it.responsibleSector,
        ].join(" "),
      );
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function downloadCsv(rows: AdminPlanItem[]) {
  const header = [
    "Organização",
    "Formulário",
    "Versão",
    "Eixo",
    "Seção",
    "Pergunta",
    "Recomendação",
    "Descrição da ação",
    "Status admin",
    "Status banco",
    "Responsável",
    "Setor",
    "Prazo",
    "Atualizado em",
    "Última atividade",
    "Atrasado",
    "Vence em 7 dias",
    "% progresso",
    "Observações",
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
        it.actionText,
        STATUS_META[it.view].label,
        it.planStatus ?? "",
        it.responsibleName,
        it.responsibleSector,
        it.dueDate ?? "",
        it.updatedAt ?? "",
        it.lastActivityLabel,
        it.isOverdue ? "Sim" : "Não",
        it.isDueSoon ? "Sim" : "Não",
        it.progress,
        it.observations ?? "",
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
  a.download = `acoes-monitoradas-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminActionPlanShell({ initialFilters, initialViewMode }: Props = {}) {
  const reportHref = "/admin/relatorios?focus=planos-acao";

  const { items, filterOptions, loading, error, refetch } = useAdminActionPlans();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<AdminPlanFiltersState>(() => {
    const url = parseStaffListUrlFilters(new URLSearchParams(searchParams.toString()));
    return {
      ...initialAdminPlanFilters,
      ...(initialFilters ?? {}),
      ...(url.search !== undefined ? { search: url.search } : {}),
      ...(url.organizationId !== undefined ? { organizationId: url.organizationId } : {}),
      ...(url.formId !== undefined ? { formId: url.formId } : {}),
      ...(url.from !== undefined ? { from: url.from } : {}),
      ...(url.to !== undefined ? { to: url.to } : {}),
      view: (url.status ?? initialFilters?.view ?? "") as AdminPlanFiltersState["view"],
    };
  });
  const [cardFilter, setCardFilter] = useState<AdminPlanSummaryFilter>(null);
  const [viewMode, setViewMode] = useState<AdminPlanViewMode>(() => {
    const fromUrl = parseStaffListLayout(new URLSearchParams(searchParams.toString()));
    if (initialViewMode === "organization") return "organization";
    return fromUrl;
  });
  const [page, setPage] = useState(0);

  const searchDebounced = useDebounce(filters.search, 250);

  useStaffListUrlSync({
    layout: viewMode,
    debouncedSearch: searchDebounced,
    filters: {
      search: filters.search,
      organizationId: filters.organizationId,
      formId: filters.formId,
      axisId: "",
      status: filters.view,
      from: filters.from,
      to: filters.to,
    },
  });

  const summaryFiltered = useMemo(
    () => applyFilters(items, filters, searchDebounced, null),
    [items, filters, searchDebounced],
  );

  const filteredItems = useMemo(
    () => applyFilters(items, filters, searchDebounced, cardFilter),
    [items, filters, searchDebounced, cardFilter],
  );

  const summary = useMemo(() => summarize(summaryFiltered), [summaryFiltered]);

  useEffect(() => {
    setPage(0);
  }, [filters, searchDebounced, cardFilter, viewMode]);

  const organizationOptions = useMemo(
    () =>
      (filterOptions?.organizations ?? []).map((o) => ({
        id: o.id,
        label: o.name,
      })),
    [filterOptions?.organizations],
  );

  const formOptions = useMemo(
    () =>
      (filterOptions?.forms ?? []).map((f) => ({
        id: f.id,
        label: `${f.name} (v${f.version})`,
      })),
    [filterOptions?.forms],
  );

  const scopeParts = useMemo((): ActionPlanScopePart[] => {
    const parts: ActionPlanScopePart[] = [];
    if (filters.organizationId) {
      const org = organizationOptions.find((o) => o.id === filters.organizationId);
      parts.push({
        label: "Órgão",
        value: org?.label ?? "Selecionado",
        onClear: () => setFilters({ ...filters, organizationId: "", formId: "" }),
      });
    }
    if (filters.formId) {
      const form = formOptions.find((f) => f.id === filters.formId);
      parts.push({
        label: "Formulário",
        value: form?.label ?? "Selecionado",
        onClear: () => setFilters({ ...filters, formId: "" }),
      });
    }
    return parts;
  }, [filters, organizationOptions, formOptions]);

  const handleRefresh = useCallback(async () => {
    await refetch();
    notify.success("Painel atualizado.");
  }, [refetch]);

  const handleExport = useCallback(() => {
    if (filteredItems.length === 0) {
      notify.warning("Nenhuma ação coincide com os filtros ativos para exportação.");
      return;
    }
    downloadCsv(filteredItems);
    notify.success("Exportação concluída.");
  }, [filteredItems]);

  const handleClearFilters = useCallback(() => {
    setFilters({ ...initialAdminPlanFilters });
    setCardFilter(null);
  }, []);

  if (loading && items.length === 0) {
    return <TableSkeleton rows={6} cols={4} />;
  }
  if (error && items.length === 0) {
    return <p className={formSurface.messageError}>{error}</p>;
  }
  if (items.length === 0) {
    return (
      <div className={layout.pageStack}>
        <div className={ADMIN_PAGE_HERO_BLEED}>
          <AdminActionPlanHero
            summary={null}
            onRefresh={() => void handleRefresh()}
            onExport={handleExport}
            reportHref={reportHref}
          />
        </div>
        <AdminActionPlanEmptyState kind="none" />
      </div>
    );
  }

  const isPaginated = viewMode === "list";
  const paged = isPaginated
    ? filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : filteredItems;
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));

  let emptyKind: "no-results" | "no-overdue" = "no-results";
  if (cardFilter === "overdue") emptyKind = "no-overdue";

  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminActionPlanHero
          summary={summary}
          loading={loading}
          onRefresh={() => void handleRefresh()}
          onExport={handleExport}
          reportHref={reportHref}
        />
      </div>

      <div className={`${layout.panelStack} gap-5 pt-1`}>
        <AdminActionPlanSummaryCards
          summary={summary}
          activeFilter={cardFilter}
          onSelect={(next) => setCardFilter(cardFilter === next ? null : next)}
        />

        <AdminActionPlanFilters
          value={filters}
          organizations={organizationOptions}
          forms={formOptions}
          onChange={setFilters}
        />

        <section className={layout.sectionStack}>
          <ActionPlanScopeBanner parts={scopeParts} />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <AdminActionPlanViewSwitcher value={viewMode} onChange={setViewMode} />
            <p className={`${typography.meta} sm:text-right`}>
              <span className="font-semibold tabular-nums text-slate-800">
                {filteredItems.length}
              </span>{" "}
              de <span className="tabular-nums text-slate-600">{items.length}</span> no escopo
            </p>
          </div>

          {filteredItems.length === 0 ? (
            <AdminActionPlanEmptyState
              kind={emptyKind}
              onClear={emptyKind === "no-results" ? handleClearFilters : undefined}
            />
          ) : viewMode === "list" ? (
            <>
              <AdminActionPlanList items={paged} />
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
            <AdminActionPlanOrganizationView items={filteredItems} />
          )}
        </section>
      </div>
    </div>
  );
}
