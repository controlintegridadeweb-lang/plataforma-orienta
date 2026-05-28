"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { RespondentEvidenceItem } from "@/lib/evidences/respondent-service";
import type { RespondentEvidenceStatus } from "@/lib/evidences/respondent-status";
import { useDebounce } from "@/lib/hooks/use-debounce";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { PanelSection } from "@/components/ui/panel-section";
import { TableSkeleton } from "@/components/ui/loading";
import { useRespondentEvidences } from "./hooks/use-respondent-evidences";
import { useRespondentStats } from "./hooks/use-respondent-stats";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import { RespondentComplementationRequests } from "./respondent-complementation-requests";
import {
  RespondentEvidenceFilters,
  type FormOption,
  type RespondentFilterValue,
} from "./respondent-evidence-filters";
import { RespondentEvidenceDetailDrawer } from "./respondent-evidence-detail-drawer";
import { RespondentEvidenceEmptyState } from "./respondent-evidence-empty-state";
import { RespondentEvidenceList } from "./respondent-evidence-list";
import { RespondentEvidenceSummaryCards } from "./respondent-evidence-summary-cards";
import { RespondentEvidencesHero } from "./respondent-evidences-hero";
import { RESPONDENT_PAGE_HERO_BLEED } from "@/lib/respondent-page-layout";

const PAGE_SIZE = 20;

export type RespondentEvidencesShellInitial = {
  status?: RespondentEvidenceStatus;
  pendingOnly?: boolean;
  formId?: string;
};

export function RespondentEvidencesShell({
  initial,
  formOptions,
}: {
  initial?: RespondentEvidencesShellInitial;
  formOptions: FormOption[];
}) {
  const [filter, setFilter] = useState<RespondentFilterValue>(() => ({
    search: "",
    formId: initial?.formId ?? "",
    status: initial?.status ?? "",
    from: "",
    to: "",
    pendingOnly: Boolean(initial?.pendingOnly),
  }));
  const [offset, setOffset] = useState(0);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [drawerItem, setDrawerItem] = useState<RespondentEvidenceItem | null>(null);

  const debouncedSearch = useDebounce(filter.search, 250);

  const fetchFilters = useMemo(
    () => ({
      formId: filter.formId || undefined,
      search: debouncedSearch.trim() || undefined,
      from: filter.from || undefined,
      to: filter.to || undefined,
      status: filter.status || undefined,
      pendingOnly: filter.pendingOnly || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    [
      filter.formId,
      debouncedSearch,
      filter.from,
      filter.to,
      filter.status,
      filter.pendingOnly,
      offset,
    ],
  );

  const { result, loading, refetch } = useRespondentEvidences(fetchFilters);
  const { stats } = useRespondentStats(
    {
      formId: fetchFilters.formId,
      search: fetchFilters.search,
      from: fetchFilters.from,
      to: fetchFilters.to,
    },
    refreshSignal,
  );

  useEffect(() => {
    setOffset(0);
  }, [
    filter.formId,
    filter.status,
    filter.from,
    filter.to,
    filter.pendingOnly,
    debouncedSearch,
  ]);

  const handleFilterChange = useCallback(
    (next: RespondentFilterValue) => setFilter(next),
    [],
  );

  const handleClear = useCallback(() => {
    setFilter({
      search: "",
      formId: "",
      status: "",
      from: "",
      to: "",
      pendingOnly: false,
    });
    setOffset(0);
  }, []);

  async function handleRefresh() {
    setRefreshSignal((n) => n + 1);
    await refetch();
  }

  /** Mapeia o card selecionado para os filtros equivalentes. */
  const summaryActiveKey = useMemo(() => {
    if (filter.pendingOnly) return "complementacao" as const;
    if (filter.status === "aprovada") return "aprovadas" as const;
    if (filter.status === "aguardando_analise") return "aguardando" as const;
    if (filter.status === "reprovada") return "reprovadas" as const;
    if (filter.status === "complementacao_solicitada") return "complementacao" as const;
    if (
      !filter.status &&
      !filter.pendingOnly &&
      !filter.formId &&
      !filter.from &&
      !filter.to &&
      !filter.search.trim()
    ) {
      return "enviadas" as const;
    }
    return null;
  }, [filter]);

  const items = result?.items ?? [];
  const total = result?.total ?? 0;
  const pageStart = items.length > 0 ? offset + 1 : 0;
  const pageEnd = offset + items.length;

  const pendingComplementations = useMemo(
    () => items.filter((i) => i.respondentStatus === "complementacao_solicitada"),
    [items],
  );

  const hasActiveFilters =
    Boolean(filter.formId) ||
    Boolean(filter.status) ||
    Boolean(filter.from) ||
    Boolean(filter.to) ||
    Boolean(filter.search.trim()) ||
    filter.pendingOnly;

  return (
    <>
      <div className={layout.pageStack}>
        <div className={RESPONDENT_PAGE_HERO_BLEED}>
          <RespondentEvidencesHero onRefresh={handleRefresh} refreshing={loading} />
        </div>

        <section className={`${layout.panelStack} pt-1`}>
        <PanelSection
          title="Indicadores"
          description="Resumo do que você enviou. Selecione um cartão para filtrar a lista."
          variant="plain"
        >
          <RespondentEvidenceSummaryCards
            stats={stats}
            loading={loading && !stats}
            activeKey={summaryActiveKey ?? null}
            onSelect={(key, sf) => {
              if (key === "enviadas") {
                handleClear();
                return;
              }
              setFilter({
                search: "",
                formId: "",
                status: sf?.status ?? "",
                from: "",
                to: "",
                pendingOnly: Boolean(sf?.pendingOnly),
              });
              setOffset(0);
            }}
          />
        </PanelSection>

        <PanelSection
          title="Filtros"
          description="Busca, formulário, status e período de envio."
          variant="plain"
        >
          <RespondentEvidenceFilters
            value={filter}
            onChange={handleFilterChange}
            onClear={handleClear}
            forms={formOptions}
            resultCount={total}
          />
        </PanelSection>

        <PanelSection
          title={evidenceComplementation.sectionTitle}
          description={
            (stats?.complementacao ?? 0) > 0
              ? evidenceComplementation.sectionDescription
              : "Quando a equipe pedir complementação de evidência, ela aparecerá aqui."
          }
          actions={
            (stats?.complementacao ?? 0) > 0 ? (
              <span
                className={`inline-flex ${formSurface.badge.base} ${formSurface.badge.warning}`}
              >
                Requer atenção · {stats?.complementacao ?? 0}{" "}
                {(stats?.complementacao ?? 0) === 1 ? "pendência" : "pendências"}
              </span>
            ) : (
              <span className={`inline-flex ${formSurface.badge.base} ${formSurface.badge.success}`}>
                Tudo em dia
              </span>
            )
          }
          variant="plain"
        >
          <RespondentComplementationRequests
            items={pendingComplementations}
            onOpenDetail={setDrawerItem}
          />
        </PanelSection>

        <PanelSection
          title="Lista de evidências"
          description="Histórico com status de validação."
          variant="plain"
        >
          {loading && items.length === 0 ? (
            <div className={formSurface.card}>
              <div className="p-4">
                <TableSkeleton rows={4} cols={3} />
              </div>
            </div>
          ) : items.length === 0 ? (
            hasActiveFilters ? (
              <RespondentEvidenceEmptyState
                variant="no-results"
                hasActiveFilters
                onClearFilters={handleClear}
              />
            ) : stats?.enviadas === 0 ? (
              <RespondentEvidenceEmptyState variant="nothing-sent" />
            ) : (
              <RespondentEvidenceEmptyState variant="no-pendency" />
            )
          ) : (
            <RespondentEvidenceList items={items} onOpenDetail={setDrawerItem} />
          )}

          {total > PAGE_SIZE ? (
            <div
              className={`${formSurface.nestedCard} mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600`}
            >
              <span>
                Mostrando{" "}
                <span className="font-semibold text-slate-700">{pageStart}-{pageEnd}</span> de{" "}
                <span className="font-semibold text-slate-700">{total}</span> evidências
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
                  Próxima <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </PanelSection>
        </section>
      </div>

      <RespondentEvidenceDetailDrawer
        open={drawerItem != null}
        item={drawerItem}
        onClose={() => setDrawerItem(null)}
      />
    </>
  );
}
