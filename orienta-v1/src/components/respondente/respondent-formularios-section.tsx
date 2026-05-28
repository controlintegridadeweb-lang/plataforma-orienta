"use client";

import { InlineLoader } from "@/components/ui/loading";
import type { RespondentProgress } from "@/lib/dashboards/queries";
import {
  respondentDashboardYearOptions,
  RESPONDENT_DASHBOARD_MIN_YEAR,
  RESPONDENT_DASHBOARD_MAX_YEAR,
} from "@/lib/dashboards/respondent-dashboard-year";
import { useRespondentYearProgress } from "@/lib/dashboards/use-respondent-year-progress";
import { YearSelect } from "@/components/ui/year-select";
import { RespondentFormsYearEmptyState } from "@/components/respondente/respondent-forms-year-empty-state";
import { RespondentFormProgressItem } from "@/components/respondente/respondent-form-progress-item";
import { RespondentFormulariosHero } from "@/components/respondente/respondent-formularios-hero";
import { RESPONDENT_PAGE_HERO_BLEED } from "@/lib/layout/respondent-page-layout";
import { formSurface } from "@/lib/layout/form-surface";
import { layout, typography } from "@/lib/layout/design-system";

type Props = {
  initialForms: RespondentProgress[];
  initialYear: number;
};

export function RespondentFormulariosSection({ initialForms, initialYear }: Props) {
  const { year, setYear, forms, loading, error } = useRespondentYearProgress({
    initialForms,
    initialYear,
  });

  return (
    <div className={layout.pageStack}>
      <div className={RESPONDENT_PAGE_HERO_BLEED}>
        <RespondentFormulariosHero />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        <section
          className={`${layout.sectionStack} ${loading ? "opacity-60 transition-opacity" : ""}`}
          aria-busy={loading}
          aria-label={`Formulários de ${year}`}
        >
          <p className={typography.sectionLabel}>Formulários</p>

          <div className={formSurface.dashboardPanel}>
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-6 md:px-7">
              <div className="min-w-0">
                <h3 className="text-base font-medium text-slate-900">Período de referência</h3>
                <p className="mt-1 text-sm text-slate-600">
                  Progresso e pendências em {year} (horário de Brasília).
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap items-end gap-3">
                <YearSelect
                  id="respondent-formularios-year"
                  label="Ano"
                  className="w-full sm:w-40"
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
                    className="inline-flex items-center gap-2 pb-2 text-sm text-slate-500"
                  />
                ) : null}
              </div>
            </div>

            <div className={`${formSurface.dashboardPanelPadding} pt-5`}>
              {forms.length === 0 ? (
                <RespondentFormsYearEmptyState year={year} loading={loading} />
              ) : (
                <ul className="space-y-3" key={year}>
                  {forms.map((form) => (
                    <RespondentFormProgressItem key={form.formId} form={form} variant="card" />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
