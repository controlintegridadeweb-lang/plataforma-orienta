"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ListChecks, Table2, User2 } from "lucide-react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import {
  getAnswersFilterOptions,
  getAnswersOverview,
  getAnswersSummary,
  getRespondentDetail,
  listAnswerRespondents,
} from "@/lib/forms/answers-client";
import {
  RESPONDENT_LIST_DEFAULT_LIMIT,
  type AnswersListFilters,
  type AnswersOverview,
  type AnswersSummary,
  type RespondentDetail,
  type RespondentFilterOptions,
  type RespondentListCursor,
  type RespondentRow,
} from "@/lib/forms/answers-types";
import { describeError, notify } from "@/lib/notify";
import { layout } from "@/lib/layout/design-system";
import { formSurface } from "@/lib/layout/form-surface";
import { AnswersOverviewCard } from "./answers-overview-card";
import { AnswersSummaryView } from "./answers-summary-view";
import { AnswersListView } from "./answers-list-view";
import { AnswersIndividualView } from "./answers-individual-view";
import { AnswersFilters } from "./answers-filters";
import { AnswersExportMenu } from "./answers-export-menu";
import {
  AnswersIndividualSkeleton,
  AnswersListSkeleton,
  AnswersOverviewSkeleton,
  AnswersSummarySkeleton,
} from "./answers-skeleton";

type ViewMode = "resumo" | "lista" | "individual";

const EMPTY_FILTERS: AnswersListFilters = {
  organizationId: null,
  status: null,
  from: null,
  to: null,
};

function filtersEqual(a: AnswersListFilters, b: AnswersListFilters): boolean {
  return (
    (a.organizationId ?? null) === (b.organizationId ?? null) &&
    (a.status ?? null) === (b.status ?? null) &&
    (a.from ?? null) === (b.from ?? null) &&
    (a.to ?? null) === (b.to ?? null)
  );
}

export function AnswersShell({ formId }: { formId: string }) {
  const [view, setView] = useState<ViewMode>("resumo");
  const [overview, setOverview] = useState<AnswersOverview | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);

  const [summary, setSummary] = useState<AnswersSummary | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  const [filters, setFilters] = useState<AnswersListFilters>(EMPTY_FILTERS);
  const [filterOptions, setFilterOptions] =
    useState<RespondentFilterOptions | null>(null);

  const [respondents, setRespondents] = useState<RespondentRow[] | null>(null);
  const [respondentsError, setRespondentsError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<RespondentListCursor | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestIdRef = useRef(0);

  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [detail, setDetail] = useState<RespondentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  // -- Loaders ------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    setOverview(null);
    setOverviewError(null);
    getAnswersOverview(formId)
      .then((data) => {
        if (!cancelled) setOverview(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setOverviewError(describeError(err, "Falha ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  useEffect(() => {
    if (view !== "resumo" || summary) return;
    let cancelled = false;
    setSummaryError(null);
    getAnswersSummary(formId)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setSummaryError(describeError(err, "Falha ao carregar."));
      });
    return () => {
      cancelled = true;
    };
  }, [formId, view, summary]);

  useEffect(() => {
    if (filterOptions) return;
    let cancelled = false;
    getAnswersFilterOptions(formId)
      .then((data) => {
        if (!cancelled) setFilterOptions(data);
      })
      .catch(() => {
        // Filtros sao opcionais; se a chamada falhar, deixamos o select de
        // orgao vazio (sem orgaos disponiveis para selecao).
      });
    return () => {
      cancelled = true;
    };
  }, [formId, filterOptions]);

  const loadRespondents = useCallback(
    async (resetList: boolean): Promise<void> => {
      const requestId = ++requestIdRef.current;
      if (resetList) {
        setRespondents(null);
        setCursor(null);
        setRespondentsError(null);
      } else {
        setLoadingMore(true);
      }
      try {
        const page = await listAnswerRespondents(formId, {
          filters,
          cursor: resetList ? null : cursor,
          limit: RESPONDENT_LIST_DEFAULT_LIMIT,
        });
        if (requestId !== requestIdRef.current) return;
        setRespondents((prev) => {
          if (resetList) return page.rows;
          return [...(prev ?? []), ...page.rows];
        });
        setCursor(page.nextCursor);
      } catch (err: unknown) {
        if (requestId !== requestIdRef.current) return;
        setRespondentsError(describeError(err, "Falha ao carregar respondentes."));
      } finally {
        if (requestId === requestIdRef.current) setLoadingMore(false);
      }
    },
    [formId, filters, cursor],
  );

  // Recarregar a lista sempre que abre a aba "lista" ou os filtros mudam.
  useEffect(() => {
    if (view !== "lista") return;
    loadRespondents(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, filters, formId]);

  // -- Selecao individual -------------------------------------------------

  useEffect(() => {
    if (!selectedOrgId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    getRespondentDetail(formId, selectedOrgId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDetailError(describeError(err, "Falha ao carregar detalhe."));
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [formId, selectedOrgId]);

  const respondentIndex = useMemo(() => {
    if (!selectedOrgId || !respondents) return -1;
    return respondents.findIndex((r) => r.organizationId === selectedOrgId);
  }, [selectedOrgId, respondents]);

  // -- Handlers UI --------------------------------------------------------

  function handleSelect(organizationId: string) {
    setSelectedOrgId(organizationId);
    setView("individual");
  }

  function handleBackToList() {
    setSelectedOrgId(null);
    setView("lista");
  }

  function handleFiltersChange(next: AnswersListFilters) {
    if (filtersEqual(filters, next)) return;
    setFilters(next);
  }

  function handleClearFilters() {
    handleFiltersChange(EMPTY_FILTERS);
  }

  function handlePrev() {
    if (!respondents || respondentIndex <= 0) return;
    setSelectedOrgId(respondents[respondentIndex - 1].organizationId);
  }

  function handleNext() {
    if (!respondents) return;
    const next = respondentIndex + 1;
    if (next >= respondents.length) {
      if (cursor) {
        // Carrega mais antes de avancar para preservar a navegacao continua.
        loadRespondents(false).then(() => {
          setRespondents((curr) => {
            if (!curr) return curr;
            const target = curr[respondentIndex + 1];
            if (target) setSelectedOrgId(target.organizationId);
            return curr;
          });
        });
      }
      return;
    }
    setSelectedOrgId(respondents[next].organizationId);
  }

  // -- Render -------------------------------------------------------------

  return (
    <div className={layout.panelStack}>
      {overviewError ? (
        <div className={formSurface.messageError} role="alert">
          {overviewError}
        </div>
      ) : !overview ? (
        <AnswersOverviewSkeleton />
      ) : (
        <AnswersOverviewCard overview={overview} />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          aria-label="Modos de visualizacao das respostas"
          items={[
            { id: "resumo", label: "Resumo" },
            { id: "lista", label: "Respondentes" },
            { id: "individual", label: "Individual" },
          ]}
          value={view}
          onChange={(id) => {
            if (id === "individual" && !selectedOrgId) {
              // Sem selecao previa, mantemos o usuario na lista para escolher.
              setView("lista");
              notify.info("Selecione um respondente na lista.");
              return;
            }
            setView(id);
          }}
        />
        <AnswersExportMenu formId={formId} filters={filters} />
      </div>

      {view === "resumo" ? (
        <SectionPanel
          title="Resumo agregado"
          description="Distribuicao das respostas por pergunta."
          icon={ListChecks}
        >
          {summaryError ? (
            <div className={formSurface.messageError} role="alert">
              {summaryError}
            </div>
          ) : !summary ? (
            <AnswersSummarySkeleton />
          ) : (
            <AnswersSummaryView summary={summary} />
          )}
        </SectionPanel>
      ) : null}

      {view === "lista" ? (
        <SectionPanel
          title="Lista de respondentes"
          description="Cada linha representa um orgao com respostas neste formulario."
          icon={Table2}
        >
          <div className="space-y-4">
            <AnswersFilters
              filters={filters}
              options={filterOptions}
              onChange={handleFiltersChange}
              onClear={handleClearFilters}
            />
            {respondentsError ? (
              <div className={formSurface.messageError} role="alert">
                {respondentsError}
              </div>
            ) : !respondents ? (
              <AnswersListSkeleton />
            ) : (
              <AnswersListView
                rows={respondents}
                hasMore={Boolean(cursor)}
                loadingMore={loadingMore}
                onLoadMore={() => loadRespondents(false)}
                onSelect={handleSelect}
              />
            )}
          </div>
        </SectionPanel>
      ) : null}

      {view === "individual" ? (
        <SectionPanel
          title="Visualizacao individual"
          description="Respostas completas do respondente selecionado."
          icon={User2}
        >
          {detailLoading ? (
            <AnswersIndividualSkeleton />
          ) : detailError ? (
            <div className={formSurface.messageError} role="alert">
              {detailError}
            </div>
          ) : !detail ? (
            <p className={formSurface.messageNeutral}>
              Selecione um respondente na lista para ver as respostas.
            </p>
          ) : (
            <AnswersIndividualView
              detail={detail}
              position={{
                current: respondentIndex >= 0 ? respondentIndex + 1 : 1,
                total: respondents?.length ?? 1,
              }}
              onBack={handleBackToList}
              onPrev={
                respondents && respondentIndex > 0 ? handlePrev : null
              }
              onNext={
                respondents &&
                (respondentIndex >= 0 &&
                  (respondentIndex + 1 < respondents.length || Boolean(cursor)))
                  ? handleNext
                  : null
              }
            />
          )}
        </SectionPanel>
      ) : null}
    </div>
  );
}

function SectionPanel({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: typeof ListChecks;
  children: React.ReactNode;
}) {
  return (
    <section className={formSurface.dashboardPanel}>
      <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-medium text-slate-900">{title}</h3>
          <p className="mt-0.5 text-sm text-slate-600">{description}</p>
        </div>
      </header>
      <div className="space-y-3 px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}
