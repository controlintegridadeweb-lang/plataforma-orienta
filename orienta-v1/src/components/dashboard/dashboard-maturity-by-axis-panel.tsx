"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import { AxisBarChart } from "@/components/charts/axis-bar-chart";
import { SectionHeader } from "@/components/ui/section-header";
import { YearSelect } from "@/components/ui/year-select";
import type { AxisMaturity } from "@/lib/fami/types";
import { fetchDashboardMaturityByAxis } from "@/lib/dashboards/client";
import { formSurface } from "@/lib/form-surface";
import { FamiScopeBanner } from "./fami-scope-banner";

type ScopeMeta = {
  scope: "global" | "organization";
  formId: string | null;
  formName: string | null;
  formState: string | null;
  isOfficialScore: boolean;
  applicableQuestions: number;
  waivedQuestions: number;
  reprocessedAt: string | null;
  globalPercentage: number | null;
  snapshotYearApplied: number | null;
};

const EMPTY_SCOPE_META: ScopeMeta = {
  scope: "global",
  formId: null,
  formName: null,
  formState: null,
  isOfficialScore: false,
  applicableQuestions: 0,
  waivedQuestions: 0,
  reprocessedAt: null,
  globalPercentage: null,
  snapshotYearApplied: null,
};

type Props = {
  initialAxes: AxisMaturity[];
  /** Valor inicial do filtro: "" = todas (media), ou id da organizacao */
  initialOrganizationId: string;
};

export function DashboardMaturityByAxisPanel({
  initialAxes,
  initialOrganizationId,
}: Props) {
  const [filters, setFilters] = useState<RecommendationFilterOptions | null>(null);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState(initialOrganizationId);
  const [closingYearFilter, setClosingYearFilter] = useState<number | null>(null);
  const [axes, setAxes] = useState<AxisMaturity[]>(initialAxes);
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [scopeMeta, setScopeMeta] = useState<ScopeMeta>(EMPTY_SCOPE_META);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRecommendationFilters()
      .then(setFilters)
      .catch((e: unknown) =>
        setFilterError(e instanceof Error ? e.message : "Falha ao carregar organizacoes."),
      );
  }, []);

  const load = useCallback(
    async (orgId: string, yearSnapshot: number | null) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchDashboardMaturityByAxis(orgId.length > 0 ? orgId : null, {
          year: yearSnapshot ?? undefined,
        });
        setAxes(res.items);
        setAvailableYears(res.availableYears);
        setScopeMeta({
          scope: res.scope,
          formId: res.formId,
          formName: res.formName,
          formState: res.formState,
          isOfficialScore: res.isOfficialScore,
          applicableQuestions: res.applicableQuestions,
          waivedQuestions: res.waivedQuestions,
          reprocessedAt: res.reprocessedAt,
          globalPercentage: res.globalPercentage,
          snapshotYearApplied: res.snapshotYearApplied,
        });
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Falha ao carregar.");
        setAxes([]);
        setScopeMeta(EMPTY_SCOPE_META);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  /** Atualiza eixos sempre que organização ou ano mudam (inclui carga inicial alinhada à API). */
  useEffect(() => {
    void load(organizationId, closingYearFilter);
  }, [organizationId, closingYearFilter, load]);

  const axesAverage =
    axes.length > 0
      ? Math.round(axes.reduce((acc, a) => acc + a.percentage, 0) / axes.length)
      : 0;
  const globalScore =
    scopeMeta.globalPercentage != null ? Math.round(scopeMeta.globalPercentage) : null;

  return (
    <div
      className={`flex h-full flex-col ${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}
    >
      <SectionHeader
        kicker="Análise"
        title="Maturidade e evidências"
        description="Score FAMI institucional e média por eixo · meta 70%"
        actions={
          axes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              {globalScore != null ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-semibold text-brand-800 ring-1 ring-inset ring-brand-100">
                  Score FAMI {globalScore}%
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100">
                Média por eixo {axesAverage}%
              </span>
            </div>
          ) : null
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-600">
          Organização
          <select
            value={organizationId}
            onChange={(e) => {
              const v = e.target.value;
              setClosingYearFilter(null);
              setOrganizationId(v);
            }}
            className={`${formSurface.inputSelect} min-w-[240px] text-[0.9375rem]`}
          >
            <option value="">Todas (media)</option>
            {filters?.organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </label>

        <YearSelect
          id="dashboard-fami-closing-year"
          label="Ano de fechamento FAMI"
          hint={
            organizationId
              ? "Base no formulário FAMI atual desta organização."
              : "Média de todas organizações usando o fechamento anual BRT de cada uma."
          }
          years={
            organizationId
              ? availableYears
              : Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - i)
          }
          value={closingYearFilter}
          onChange={setClosingYearFilter}
          disabled={loading}
        />

        {loading ? (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Atualizando...
          </span>
        ) : null}
      </div>
      {filterError ? <p className="mb-2 text-sm text-rose-600">{filterError}</p> : null}
      <div className="mb-3">
        <FamiScopeBanner
          scope={scopeMeta.scope}
          formName={scopeMeta.formName}
          formState={scopeMeta.formState}
          isOfficialScore={scopeMeta.isOfficialScore}
          applicableQuestions={scopeMeta.applicableQuestions}
          waivedQuestions={scopeMeta.waivedQuestions}
          snapshotYearApplied={scopeMeta.snapshotYearApplied}
          reprocessedAt={scopeMeta.reprocessedAt}
        />
      </div>
      {error ? <p className="mb-2 text-sm text-rose-600">{error}</p> : null}
      <div className="min-h-[288px] h-[min(24rem,40vh)] sm:h-80">
        <AxisBarChart data={axes} />
      </div>
    </div>
  );
}
