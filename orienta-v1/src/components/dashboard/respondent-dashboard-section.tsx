"use client";

import { ClipboardList, FileCheck, MessageSquareWarning } from "lucide-react";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import { InlineLoader } from "@/components/ui/loading";
import type { RespondentProgress } from "@/lib/dashboards/queries";
import type { RespondentDashboardSummary } from "@/lib/dashboards/respondent-dashboard-summary";
import {
  respondentDashboardYearOptions,
  RESPONDENT_DASHBOARD_MIN_YEAR,
  RESPONDENT_DASHBOARD_MAX_YEAR,
} from "@/lib/dashboards/respondent-dashboard-year";
import { useRespondentYearProgress } from "@/lib/dashboards/use-respondent-year-progress";
import { RespondentDashboardFormsPanel } from "@/components/dashboard/respondent-dashboard-forms-panel";
import { RespondentDashboardHero } from "@/components/dashboard/respondent-dashboard-hero";
import { KpiCard } from "@/components/ui/kpi-card";
import { YearSelect } from "@/components/ui/year-select";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";
import { RESPONDENT_PAGE_HERO_BLEED } from "@/lib/respondent-page-layout";

type Props = {
  initialForms: RespondentProgress[];
  initialYear: number;
  initialSummary: RespondentDashboardSummary;
};

export function RespondentDashboardSection({
  initialForms,
  initialYear,
  initialSummary,
}: Props) {
  const { year, setYear, forms, summary, loading, error } = useRespondentYearProgress({
    initialForms,
    initialYear,
    initialSummary,
  });

  const progressHint = `${summary.progressPct}% de progresso em ${year}`;

  return (
    <div className={layout.pageStack}>
      <div className={RESPONDENT_PAGE_HERO_BLEED}>
        <RespondentDashboardHero year={year} />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
        <div
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          role="group"
          aria-label="Filtro por período"
        >
          <YearSelect
            id="respondent-dashboard-year"
            label="Ano"
            minYear={RESPONDENT_DASHBOARD_MIN_YEAR}
            maxYear={RESPONDENT_DASHBOARD_MAX_YEAR}
            years={respondentDashboardYearOptions()}
            value={year}
            onChange={(y) => {
              if (y != null) setYear(y);
            }}
            includeAllOption={false}
            disabled={loading}
          />
          {loading ? (
            <InlineLoader
              label="Atualizando…"
              className="inline-flex items-center gap-2 pb-0.5 text-sm text-slate-500 sm:pb-2"
            />
          ) : null}
        </div>

        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <section
          className={`${layout.sectionStack} ${loading ? "opacity-60 transition-opacity" : ""}`}
          aria-busy={loading}
        >
          <p className={typography.sectionLabel}>Resumo</p>
          <div className={layout.kpiGrid3}>
            <KpiCard
              label="Formularios abertos"
              value={summary.openForms}
              icon={ClipboardList}
              tone="emerald"
            />
            <KpiCard
              label="Questoes respondidas"
              value={`${summary.totalAnswered}/${summary.totalQuestions}`}
              icon={FileCheck}
              tone="blue"
              hint={progressHint}
            />
            <KpiCard
              label={evidenceComplementation.kpiLabel}
              value={summary.totalComplementation}
              icon={MessageSquareWarning}
              tone={summary.totalComplementation > 0 ? "rose" : "slate"}
              href="/respondente/evidencias-complementacoes"
              ctaLabel={
                summary.totalComplementation > 0 ? "Ver pendências" : "Abrir evidências"
              }
              hint={
                summary.totalComplementation > 0
                  ? evidenceComplementation.kpiHintPending
                  : evidenceComplementation.kpiHintEmpty
              }
            />
          </div>
        </section>

        <section className={layout.sectionStack}>
          <p className={typography.sectionLabel}>Formulários</p>
          <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}>
            <RespondentDashboardFormsPanel forms={forms} year={year} loading={loading} />
          </div>
        </section>
      </div>
    </div>
  );
}
