"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EvidenceFilterOptions, EvidenceListItem } from "@/lib/evidences/admin-service";
import { loadEvidenceFilters } from "@/lib/evidences/client";
import type { ValidationStatus } from "@/lib/evidences/schemas";
import { EVIDENCE_VALIDATION_REGISTRY } from "@/lib/domain/status-registry";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { describeError, notify } from "@/lib/notify";
import { layout } from "@/lib/layout/design-system";
import { formSurface } from "@/lib/layout/form-surface";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/layout/admin-page-layout";
import { EvidencesTableSkeleton } from "@/components/evidencias/evidences-skeleton";
import { AdminEvidencesHero } from "./admin-evidences-hero";
import { EvidenceDetailDrawer } from "./evidence-detail-drawer";
import { EvidencesCardsList } from "./evidences-cards-list";
import { EvidencesEmptyState } from "./evidences-empty-state";
import { EvidencesFilters, type EvidencesFilterState } from "./evidences-filters";
import { EvidencesHeader } from "./evidences-header";
import { EvidencesKpiCards } from "./evidences-kpi-cards";
import { EvidencesTable } from "./evidences-table";
import { useEvidenceSelection } from "./hooks/use-evidence-selection";
import { useEvidencesList } from "./hooks/use-evidences-list";

const PAGE_SIZE = 25;

const VALID_STATUSES = new Set<string>(Object.keys(EVIDENCE_VALIDATION_REGISTRY));

function normalizeEvidenceInitialStatus(
  value: string | ValidationStatus | undefined,
): "" | ValidationStatus {
  if (value == null || value === "") return "";
  const s = String(value);
  return VALID_STATUSES.has(s) ? (s as ValidationStatus) : "";
}

export type EvidencesShellInitialFilters = {
  organizationId?: string;
  formId?: string;
  status?: ValidationStatus;
};

export function EvidencesShell({
  initialFilters,
  variant = "admin",
}: {
  initialFilters?: EvidencesShellInitialFilters;
  variant?: "admin";
} = {}) {
  const [filterOptions, setFilterOptions] = useState<EvidenceFilterOptions | null>(null);
  const [filter, setFilter] = useState<EvidencesFilterState>(() => ({
    formId: initialFilters?.formId?.trim() ?? "",
    organizationId: initialFilters?.organizationId?.trim() ?? "",
    status: normalizeEvidenceInitialStatus(initialFilters?.status),
    search: "",
    from: "",
    to: "",
  }));
  const [offset, setOffset] = useState(0);
  const [drawerItem, setDrawerItem] = useState<EvidenceListItem | null>(null);
  const [refreshSignal, setRefreshSignal] = useState(0);

  const debouncedSearch = useDebounce(filter.search, 250);
  const selection = useEvidenceSelection();

  const { result, loading, refetch, updateAfterValidation } = useEvidencesList({
    formId: filter.formId || undefined,
    organizationId: filter.organizationId || undefined,
    status: filter.status || undefined,
    search: debouncedSearch.trim() || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
    limit: PAGE_SIZE,
    offset,
  });

  useEffect(() => {
    loadEvidenceFilters()
      .then(setFilterOptions)
      .catch((e: unknown) =>
        notify.error(describeError(e, "Falha ao carregar filtros.")),
      );
  }, []);

  useEffect(() => {
    setOffset(0);
  }, [
    filter.formId,
    filter.organizationId,
    filter.status,
    filter.from,
    filter.to,
    debouncedSearch,
  ]);

  const statsFilters = useMemo(
    () => ({
      formId: filter.formId || undefined,
      organizationId: filter.organizationId || undefined,
      search: debouncedSearch.trim() || undefined,
      from: filter.from || undefined,
      to: filter.to || undefined,
    }),
    [
      filter.formId,
      filter.organizationId,
      debouncedSearch,
      filter.from,
      filter.to,
    ],
  );

  const exportFilters = useMemo(
    () => ({
      ...statsFilters,
      status: filter.status || undefined,
    }),
    [statsFilters, filter.status],
  );

  const handleFilterChange = useCallback((next: EvidencesFilterState) => {
    setFilter(next);
  }, []);

  const handleClear = useCallback(() => {
    setFilter({
      formId: "",
      organizationId: "",
      status: "",
      search: "",
      from: "",
      to: "",
    });
    setOffset(0);
    selection.clear();
  }, [selection.clear]);

  async function handleRefresh() {
    setRefreshSignal((n) => n + 1);
    await refetch();
  }

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageStart = items.length > 0 ? offset + 1 : 0;
  const pageEnd = offset + items.length;
  const pageIds = useMemo(() => items.map((i) => i.id), [items]);
  const allPageSelected = selection.isAllOnPage(pageIds);

  const hasActiveFilters =
    Boolean(filter.formId) ||
    Boolean(filter.organizationId) ||
    Boolean(filter.status) ||
    Boolean(filter.search.trim()) ||
    Boolean(filter.from) ||
    Boolean(filter.to);

  const content = (
    <>
      {variant !== "admin" ? (
        <EvidencesHeader
          onRefresh={handleRefresh}
          refreshing={loading}
          exportFilters={exportFilters}
          selectedIds={selection.selectedIds}
        />
      ) : null}

      <EvidencesKpiCards filters={statsFilters} refreshSignal={refreshSignal} />

      <EvidencesFilters
        options={filterOptions}
        value={filter}
        onChange={handleFilterChange}
        onClear={handleClear}
        loading={loading}
      />

      {loading && items.length === 0 ? (
        <EvidencesTableSkeleton />
      ) : items.length === 0 ? (
        <EvidencesEmptyState
          onClearFilters={handleClear}
          hasActiveFilters={hasActiveFilters}
        />
      ) : (
        <>
          <EvidencesTable
            items={items}
            selected={selection.selected}
            onToggleSelect={selection.toggle}
            onToggleAllPage={() => selection.toggleAllOnPage(pageIds)}
            allPageSelected={allPageSelected}
            onOpenDetail={setDrawerItem}
          />
          <EvidencesCardsList
            items={items}
            selected={selection.selected}
            onToggleSelect={selection.toggle}
            onOpenDetail={setDrawerItem}
          />
        </>
      )}

      {total > 0 ? (
        <div
          className={`flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-xs text-slate-600 sm:px-5 ${formSurface.card}`}
        >
          <span>
            Mostrando{" "}
            <span className="font-semibold text-slate-700">{pageStart}-{pageEnd}</span> de{" "}
            <span className="font-semibold text-slate-700">{total}</span> evidencias
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={offset === 0 || loading}
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden /> Anterior
            </button>
            <button
              type="button"
              disabled={pageEnd >= total || loading}
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              Proxima <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ) : null}

      <EvidenceDetailDrawer
        item={drawerItem}
        open={drawerItem != null}
        onClose={() => setDrawerItem(null)}
        onValidated={(id, entry) => {
          updateAfterValidation(id, entry);
          setDrawerItem((prev) =>
            prev && prev.id === id
              ? {
                  ...prev,
                  currentStatus: entry.status,
                  lastValidatedAt: entry.validatedAt,
                  lastJustification: entry.justification,
                  history: [entry, ...prev.history],
                }
              : prev,
          );
        }}
        formsAreaPrefix={variant}
      />
    </>
  );

  if (variant === "admin") {
    return (
      <div className={layout.pageStack}>
        <div className={ADMIN_PAGE_HERO_BLEED}>
          <AdminEvidencesHero
            onRefresh={handleRefresh}
            refreshing={loading}
            exportFilters={exportFilters}
            selectedIds={selection.selectedIds}
          />
        </div>

        <section className={`${layout.panelStack} pt-1`}>{content}</section>
      </div>
    );
  }

  return <section className={layout.panelStack}>{content}</section>;
}
