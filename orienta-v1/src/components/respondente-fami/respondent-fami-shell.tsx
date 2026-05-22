"use client";

import { useMemo, useState } from "react";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { interpretSnapshot, rankAxesByImpact } from "@/lib/fami/respondent-presentation";
import { PanelSection } from "@/components/ui/panel-section";
import { formSurface } from "@/lib/form-surface";
import { useRespondentFami } from "./hooks/use-respondent-fami";
import { RespondentFamiInstitutionalCard } from "./respondent-fami-institutional-card";
import { RespondentFamiFilters } from "./respondent-fami-filters";
import { RespondentFamiScopeBanner } from "./respondent-fami-scope-banner";
import { RespondentFamiFormBreakdown } from "./respondent-fami-form-breakdown";
import { RespondentFamiInsights } from "./respondent-fami-insights";
import { RespondentFamiAxisOverview } from "./respondent-fami-axis-overview";
import { RespondentFamiRadarChart } from "./respondent-fami-radar-chart";
import { RespondentFamiSectionList } from "./respondent-fami-section-list";
import { RespondentFamiEvolution } from "./respondent-fami-evolution";
import { RespondentFamiRecommendationsImpact } from "./respondent-fami-recommendations-impact";
import { RespondentFamiEvidenceImpact } from "./respondent-fami-evidence-impact";
import { RespondentFamiEmptyState } from "./respondent-fami-empty-state";
import { FamiMethodologyGuide } from "@/components/fami/fami-methodology-guide";

type Props = {
  defaultOrganizationId: string | null;
};

type TabId = "panorama" | "eixos" | "secoes" | "evolucao";

export function RespondentFamiShell({ defaultOrganizationId }: Props) {
  const {
    state,
    organizationId,
    setFormId,
    setSnapshotYearFilter,
    snapshotYearFilter,
    refresh,
    axisStats,
    isInstitutionalView,
    activeSnapshot,
  } = useRespondentFami(defaultOrganizationId);

  const [tab, setTab] = useState<TabId>("panorama");

  const institutionalSnapshot = state.institutional?.snapshot ?? null;
  const institutionalEvolution = state.institutional?.evolutionByYear ?? [];
  const institutionalYears = state.institutional?.availableYears ?? [];
  const institutionalMeta = state.institutional?.latestVersionMeta ?? null;
  const formBreakdown = state.institutional?.formBreakdown ?? [];

  const detailSnapshot = activeSnapshot?.snapshot ?? null;
  const evolutionByYear = activeSnapshot?.evolutionByYear ?? [];
  const availableYears = activeSnapshot?.availableYears ?? [];
  const detailMeta = activeSnapshot?.latestVersionMeta ?? null;

  const insights = useMemo(() => interpretSnapshot(detailSnapshot), [detailSnapshot]);
  const axesRanked = useMemo(
    () => (detailSnapshot ? rankAxesByImpact(detailSnapshot.axes) : []),
    [detailSnapshot],
  );

  const orgName =
    state.filters?.organizations.find((o) => o.id === organizationId)?.name ?? "";
  const forms = state.filters?.forms ?? [];
  const selectedForm = forms.find((f) => f.id === state.formId);

  function handleExport() {
    if (!detailSnapshot) return;
    const scopeLabel = isInstitutionalView
      ? "Institucional-consolidado"
      : selectedForm?.name ?? "formulario";
    const rows: string[] = [
      "Escopo;Nome;Percentual;Nivel;Pontos obtidos;Pontos possiveis",
      `Global;${scopeLabel};${detailSnapshot.global?.percentage.toFixed(2) ?? ""};${
        detailSnapshot.global?.maturityLevel ?? ""
      };${detailSnapshot.global?.pointsObtained.toFixed(2) ?? ""};${
        detailSnapshot.global?.pointsPossible.toFixed(2) ?? ""
      }`,
      ...detailSnapshot.axes.map(
        (a) =>
          `Eixo;${escape(a.axisName)};${a.percentage.toFixed(2)};${a.maturityLevel};;`,
      ),
      ...detailSnapshot.sections.map(
        (s) =>
          `Secao;${escape(s.sectionName)};${s.percentage.toFixed(2)};${s.maturityLevel};${s.pointsObtained.toFixed(2)};${s.pointsPossible.toFixed(2)}`,
      ),
    ];
    const csv = "\uFEFF" + rows.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fami-${orgName || "organizacao"}-${scopeLabel}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  if (state.loading) {
    return (
      <section className="space-y-6">
        <div className={`h-40 ${formSurface.skeleton} rounded-xl border border-slate-200`} />
        <div className={`h-24 ${formSurface.skeleton} rounded-xl border border-slate-200`} />
      </section>
    );
  }

  if (state.error) {
    return (
      <section className={formSurface.messageError}>
        Não foi possível carregar os dados FAMI. {state.error}
      </section>
    );
  }

  if (!organizationId) {
    return (
      <section className={formSurface.messageWarning}>
        Seu perfil não está vinculado a uma organização. Solicite ao administrador a
        associação para visualizar a maturidade institucional.
      </section>
    );
  }

  const institutionalLastAt =
    institutionalMeta?.createdAt ?? institutionalSnapshot?.global?.createdAt ?? null;

  return (
    <section className="space-y-5 sm:space-y-6">
      <RespondentFamiInstitutionalCard
        organizationName={orgName}
        formsCount={forms.length}
        percentage={institutionalSnapshot?.global?.percentage ?? null}
        level={institutionalSnapshot?.global?.maturityLevel ?? null}
        pointsObtained={institutionalSnapshot?.global?.pointsObtained}
        pointsPossible={institutionalSnapshot?.global?.pointsPossible}
        lastProcessedAt={institutionalLastAt}
      />

      <FamiMethodologyGuide
        currentLevel={
          institutionalSnapshot?.global?.maturityLevel ??
          detailSnapshot?.global?.maturityLevel ??
          null
        }
      />

      <PanelSection
        title="Filtros"
        description="Escolha o escopo da análise, o ano de referência ou exporte os dados."
        variant="plain"
      >
        <RespondentFamiFilters
          forms={forms}
          formId={state.formId}
          onFormChange={setFormId}
          availableYears={availableYears.length ? availableYears : institutionalYears}
          snapshotYear={snapshotYearFilter}
          onSnapshotYearChange={setSnapshotYearFilter}
          loading={state.refreshing}
          exportDisabled={!detailSnapshot?.global}
          filtersDisabled={state.refreshing}
          onRefresh={() => void refresh()}
          onExport={handleExport}
        />
      </PanelSection>

      {!isInstitutionalView && selectedForm ? (
        <RespondentFamiScopeBanner
          formName={selectedForm.name}
          formVersion={selectedForm.version}
          percentage={detailSnapshot?.global?.percentage ?? null}
          level={detailSnapshot?.global?.maturityLevel ?? null}
          lastProcessedAt={detailMeta?.createdAt ?? detailSnapshot?.global?.createdAt ?? null}
        />
      ) : null}

      {forms.length === 0 ? (
        <RespondentFamiEmptyState kind="no-form" />
      ) : !detailSnapshot?.global ? (
        <RespondentFamiEmptyState kind="no-snapshot" yearFiltered={snapshotYearFilter} />
      ) : isInstitutionalView ? (
        <div className="space-y-5 sm:space-y-6">
          <RespondentFamiFormBreakdown
            forms={forms}
            scores={formBreakdown}
            selectedFormId={state.formId}
            onSelectForm={setFormId}
          />

          <PanelSection
            title="Evolução institucional"
            description="Média anual consolidada da organização."
            variant="plain"
          >
            <RespondentFamiEvolution granularity="years" points={institutionalEvolution} />
          </PanelSection>
        </div>
      ) : (
        <>
          <RespondentFamiInsights summary={insights.summary} cards={insights.cards} />

          <PanelSection
            title="Análise detalhada"
            description="Panorama, eixos, seções e evolução deste diagnóstico."
            variant="plain"
          >
            <div className={formSurface.nestedCardWithHeader}>
              <div className="border-b border-slate-100/80 bg-slate-50/60 p-1.5 sm:p-2">
                <SegmentedTabs<TabId>
                  variant="bare"
                  aria-label="Visões do FAMI"
                  value={tab}
                  onChange={setTab}
                  items={[
                    { id: "panorama", label: "Panorama" },
                    { id: "eixos", label: "Por eixo" },
                    { id: "secoes", label: "Por seção" },
                    { id: "evolucao", label: "Evolução" },
                  ]}
                />
              </div>
            </div>

            {tab === "panorama" ? (
              <div className="space-y-4">
                <RespondentFamiAxisOverview
                  axes={detailSnapshot.axes}
                  statsByAxisName={
                    new Map(
                      Array.from(axisStats.entries()).map(([k, v]) => [
                        k,
                        {
                          recommendationsOpen: v.recommendationsOpen,
                          recommendationsTotal: v.recommendationsTotal,
                          evidencesPending: v.evidencesPending,
                        },
                      ]),
                    )
                  }
                />
                <RespondentFamiRecommendationsImpact
                  axes={axesRanked}
                  statsByAxisName={
                    new Map(
                      Array.from(axisStats.entries()).map(([k, v]) => [
                        k,
                        {
                          open: v.recommendationsOpen,
                          total: v.recommendationsTotal,
                          awaitingAction: v.awaitingAction,
                        },
                      ]),
                    )
                  }
                />
                <RespondentFamiEvidenceImpact stats={state.evidenceStats} />
              </div>
            ) : tab === "eixos" ? (
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <RespondentFamiRadarChart axes={detailSnapshot.axes} title="Radar de maturidade" />
                <RespondentFamiAxisOverview
                  axes={detailSnapshot.axes}
                  statsByAxisName={
                    new Map(
                      Array.from(axisStats.entries()).map(([k, v]) => [
                        k,
                        {
                          recommendationsOpen: v.recommendationsOpen,
                          recommendationsTotal: v.recommendationsTotal,
                          evidencesPending: v.evidencesPending,
                        },
                      ]),
                    )
                  }
                />
              </div>
            ) : tab === "secoes" ? (
              <RespondentFamiSectionList sections={detailSnapshot.sections} />
            ) : (
              <RespondentFamiEvolution granularity="years" points={evolutionByYear} />
            )}
          </PanelSection>
        </>
      )}
    </section>
  );
}

function escape(value: string): string {
  return value.replace(/;/g, ",").replace(/\n/g, " ");
}
