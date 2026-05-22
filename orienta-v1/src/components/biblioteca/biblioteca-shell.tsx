"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import {
  LIBRARY_CONFIG,
  LIBRARY_TAB_LABEL,
  LIBRARY_TAB_ORDER,
} from "@/lib/library/config";
import { LibraryFilters, type LibraryFiltersState } from "./library-filters";
import {
  createLibraryItem,
  deleteLibraryItem,
  transitionLibraryItem,
  updateLibraryItem,
  type LibraryTransition,
} from "@/lib/library/client";
import type {
  LibraryAxis,
  LibraryCatalogEntity,
  LibraryCatalogItem,
  LibraryCatalogSnapshot,
  LibraryModelAction,
  LibraryRecommendationBase,
  LibrarySection,
} from "@/lib/library/types";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { layout, typography } from "@/lib/design-system";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { formSurface } from "@/lib/form-surface";
import { describeError, notify } from "@/lib/notify";
import { AdminBibliotecaHero } from "./admin-biblioteca-hero";
import { EntityTable } from "./entity-table";
import { EntityModal } from "./entity-modal";
import { LibraryEntityTabs } from "./library-entity-tabs";

type DeleteTarget = { entity: LibraryCatalogEntity; item: LibraryCatalogItem } | null;
const ITEMS_PER_PAGE = 10;

type Props = {
  initial: LibraryCatalogSnapshot;
  layout?: "default" | "admin";
  error?: string | null;
};

export function BibliotecaShell({ initial, layout: pageLayout = "default", error }: Props) {
  const [snapshot, setSnapshot] = useState<LibraryCatalogSnapshot>(initial);
  const [activeTab, setActiveTab] = useState<LibraryCatalogEntity>("axes");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<LibraryCatalogItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<LibraryFiltersState>({
    search: "",
    status: "all",
    tag: "",
  });
  const [isPending, startTransition] = useTransition();

  const config = LIBRARY_CONFIG[activeTab];
  const hasActiveFilters = filters.search || filters.status !== "all" || filters.tag;
  const isAdminLayout = pageLayout === "admin";

  const allItems = useMemo<LibraryCatalogItem[]>(() => {
    switch (activeTab) {
      case "axes":
        return snapshot.axes;
      case "sections":
        return snapshot.sections;
      case "recommendations":
        return snapshot.recommendations;
      case "actions":
        return snapshot.actions;
    }
  }, [activeTab, snapshot]);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of allItems) {
      for (const tag of item.tags ?? []) set.add(tag);
    }
    return Array.from(set).sort();
  }, [allItems]);

  const filteredItems = useMemo<LibraryCatalogItem[]>(() => {
    const search = filters.search.trim().toLowerCase();
    return allItems.filter((item) => {
      if (filters.status !== "all" && item.status !== filters.status) return false;
      if (filters.tag && !(item.tags ?? []).includes(filters.tag)) return false;
      if (!search) return true;
      const haystack = Object.values(item as Record<string, unknown>)
        .filter((v) => typeof v === "string")
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [allItems, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / ITEMS_PER_PAGE));
  const page = Math.min(Math.max(1, currentPage), totalPages);
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);

  const currentItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [page, filteredItems]);

  function handleTabChange(id: LibraryCatalogEntity) {
    setCurrentPage(1);
    setActiveTab(id);
  }

  function handleFiltersChange(next: LibraryFiltersState) {
    setCurrentPage(1);
    setFilters(next);
  }

  function openCreateForTab(tab: LibraryCatalogEntity) {
    setActiveTab(tab);
    setCurrentPage(1);
    setEditing(null);
    setModalOpen(true);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: LibraryCatalogItem) {
    setEditing(item);
    setModalOpen(true);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
    setEditing(null);
  }

  function replaceInSnapshot(entity: LibraryCatalogEntity, item: LibraryCatalogItem) {
    setSnapshot((prev) => {
      switch (entity) {
        case "axes":
          return {
            ...prev,
            axes: upsertById(prev.axes, item as LibraryAxis),
          };
        case "sections":
          return {
            ...prev,
            sections: upsertById(prev.sections, item as LibrarySection),
          };
        case "recommendations":
          return {
            ...prev,
            recommendations: upsertById(
              prev.recommendations,
              item as LibraryRecommendationBase,
            ),
          };
        case "actions":
          return {
            ...prev,
            actions: upsertById(prev.actions, item as LibraryModelAction),
          };
      }
    });
  }

  function removeFromSnapshot(entity: LibraryCatalogEntity, id: string) {
    setSnapshot((prev) => {
      switch (entity) {
        case "axes":
          return { ...prev, axes: prev.axes.filter((a) => a.id !== id) };
        case "sections":
          return { ...prev, sections: prev.sections.filter((a) => a.id !== id) };
        case "recommendations":
          return {
            ...prev,
            recommendations: prev.recommendations.filter((a) => a.id !== id),
          };
        case "actions":
          return { ...prev, actions: prev.actions.filter((a) => a.id !== id) };
      }
    });
  }

  async function handleSubmit(payload: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const saved = editing
        ? await updateLibraryItem(activeTab, editing.id, payload)
        : await createLibraryItem(activeTab, payload);
      replaceInSnapshot(activeTab, saved);
      notify.success(
        editing
          ? `${config.singular} atualizado com sucesso.`
          : `${config.singular} cadastrado com sucesso.`,
      );
      setModalOpen(false);
      setEditing(null);
    } catch (error) {
      notify.error(describeError(error, "Falha ao salvar."));
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  function askDelete(item: LibraryCatalogItem) {
    setDeleteTarget({ entity: activeTab, item });
  }

  async function handleTransition(
    item: LibraryCatalogItem,
    action: LibraryTransition,
    payload: { justification?: string | null },
  ) {
    const updated = await transitionLibraryItem(activeTab, item.id, action, payload);
    replaceInSnapshot(activeTab, updated);
    notify.success(`${config.singular} atualizado para "${updated.status}".`);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    startTransition(async () => {
      try {
        await deleteLibraryItem(target.entity, target.item.id);
        removeFromSnapshot(target.entity, target.item.id);
        notify.success(
          `${LIBRARY_CONFIG[target.entity].singular} removido com sucesso.`,
        );
      } catch (error) {
        notify.error(describeError(error, "Falha ao remover."));
      } finally {
        setDeleteTarget(null);
      }
    });
  }

  const catalogPanel = (
    <div className={isAdminLayout ? formSurface.dashboardPanel : "rounded-lg border border-slate-200 bg-white shadow-sm"}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <h3 className="text-base font-medium text-slate-900">{config.title}</h3>
          <p className="mt-1 text-sm text-slate-600">
            {hasActiveFilters
              ? `${filteredItems.length} de ${allItems.length} itens`
              : `${allItems.length} ${allItems.length === 1 ? "item" : "itens"}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters ? (
            <span className={`${formSurface.badge.base} ${formSurface.badge.warning}`}>
              Filtros ativos
            </span>
          ) : null}
          {!isAdminLayout ? (
            <button
              type="button"
              onClick={openCreate}
              className={`${formSurface.primaryButtonSm} gap-2`}
            >
              <Plus className="h-4 w-4" aria-hidden />
              {config.addLabel}
            </button>
          ) : (
            <button
              type="button"
              onClick={openCreate}
              className={formSurface.secondaryButtonSm}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              {config.addLabel}
            </button>
          )}
        </div>
      </div>

      <LibraryFilters
        state={filters}
        availableTags={availableTags}
        onChange={handleFiltersChange}
      />

      <div className={isAdminLayout ? `${formSurface.dashboardPanelPadding} pt-5` : "p-5"}>
        <EntityTable
          config={config}
          items={currentItems}
          onEdit={openEdit}
          onDelete={askDelete}
          onTransition={handleTransition}
          disabled={isPending}
        />

        {filteredItems.length > ITEMS_PER_PAGE ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200/80 bg-slate-50/50 px-4 py-3 text-xs text-slate-600">
            <span>
              Página <span className="font-semibold text-slate-800">{page}</span> de{" "}
              <span className="font-semibold text-slate-800">{totalPages}</span> · exibindo{" "}
              <span className="font-semibold text-slate-800">{currentItems.length}</span> de{" "}
              <span className="font-semibold text-slate-800">{filteredItems.length}</span>{" "}
              resultados
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className={`${formSurface.secondaryButtonSm} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Anterior
              </button>
              <div className="flex items-center gap-1">
                {pageNumbers.map((pageNumber, index) =>
                  pageNumber === "ellipsis" ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="inline-flex min-w-8 items-center justify-center px-1 text-slate-400"
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={pageNumber}
                      type="button"
                      onClick={() => setCurrentPage(pageNumber)}
                      aria-current={page === pageNumber ? "page" : undefined}
                      className={`inline-flex min-w-8 items-center justify-center rounded-lg border px-2 py-1.5 text-xs font-medium transition ${
                        page === pageNumber
                          ? "border-brand-200 bg-brand-50 text-brand-700"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {pageNumber}
                    </button>
                  ),
                )}
              </div>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className={`${formSurface.secondaryButtonSm} disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Próxima
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );

  const modals = (
    <>
      <EntityModal
        config={config}
        open={modalOpen}
        editing={editing}
        axes={snapshot.axes}
        submitting={submitting}
        onClose={closeModal}
        onSubmit={handleSubmit}
      />

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          role="alertdialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-[var(--shadow-popover)]">
            <h3 className="text-base font-semibold text-slate-900">
              Remover {LIBRARY_CONFIG[deleteTarget.entity].singular}?
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Essa ação não pode ser desfeita. Itens vinculados podem impedir a remoção.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isPending}
                className={`${formSurface.secondaryButton} disabled:opacity-50`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isPending}
                className={`${formSurface.dangerButton} disabled:opacity-50`}
              >
                {isPending ? "Removendo…" : "Remover"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );

  if (isAdminLayout) {
    return (
      <div className={layout.pageStack}>
        <div className={ADMIN_PAGE_HERO_BLEED}>
          <article className={`${formSurface.card} overflow-hidden`}>
            <AdminBibliotecaHero
              onNewAxis={() => openCreateForTab("axes")}
              onNewSection={() => openCreateForTab("sections")}
            />
            <LibraryEntityTabs activeTab={activeTab} onChange={handleTabChange} />
          </article>
        </div>

        <div className={`${layout.panelStack} pt-1`}>
          {error ? <div className={formSurface.messageError}>{error}</div> : null}
          <section className={layout.sectionStack} aria-label="Catálogo">
            <p className={typography.sectionLabel}>{LIBRARY_TAB_LABEL[activeTab]}</p>
            {catalogPanel}
          </section>
        </div>

        {modals}
      </div>
    );
  }

  return (
    <div className={layout.panelStack}>
      <SegmentedTabs
        aria-label="Abas da Biblioteca Geral"
        value={activeTab}
        onChange={(id) => handleTabChange(id)}
        items={LIBRARY_TAB_ORDER.map((entity) => ({
          id: entity,
          label: LIBRARY_TAB_LABEL[entity],
        }))}
      />
      {catalogPanel}
      {modals}
    </div>
  );
}

function upsertById<T extends { id: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((current) => current.id === item.id);
  if (index === -1) return [...list, item];
  const next = [...list];
  next[index] = item;
  return next;
}

function buildPageNumbers(currentPage: number, totalPages: number): Array<number | "ellipsis"> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  const sorted = Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);

  const withEllipsis: Array<number | "ellipsis"> = [];
  for (let index = 0; index < sorted.length; index += 1) {
    const page = sorted[index];
    const previous = sorted[index - 1];
    if (index > 0 && previous !== undefined && page - previous > 1) {
      withEllipsis.push("ellipsis");
    }
    withEllipsis.push(page);
  }
  return withEllipsis;
}
