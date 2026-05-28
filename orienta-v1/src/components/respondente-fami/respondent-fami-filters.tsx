"use client";

import Link from "next/link";
import { ClipboardList, Download, RefreshCw } from "lucide-react";
import { YearSelect } from "@/components/ui/year-select";
import { FAMI_ALL_FORMS } from "@/lib/fami/constants";
import { formSurface } from "@/lib/layout/form-surface";

type FormOpt = { id: string; name: string; version: number };

type Props = {
  forms: FormOpt[];
  formId: string;
  onFormChange: (id: string) => void;
  availableYears: number[];
  snapshotYear: number | null;
  onSnapshotYearChange: (y: number | null) => void;
  loading: boolean;
  exportDisabled: boolean;
  filtersDisabled?: boolean;
  onRefresh: () => void;
  onExport: () => void;
};

/** Alinha botões à linha dos selects (label + espaçamento do fieldGroup). */
const ACTIONS_ROW_PT = "sm:pt-5.5";

const FILTER_ROW =
  "flex w-full min-w-0 flex-col gap-4 border-b border-slate-200/50 bg-slate-50/50 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-start sm:gap-x-4 sm:gap-y-3 sm:px-5 sm:py-3.5";

export function RespondentFamiFilters({
  forms,
  formId,
  onFormChange,
  availableYears,
  snapshotYear,
  onSnapshotYearChange,
  loading,
  exportDisabled,
  filtersDisabled,
  onRefresh,
  onExport,
}: Props) {
  return (
    <div
      className={`${formSurface.dashboardPanel} overflow-hidden`}
      aria-label="Filtros da pontuação FAMI"
    >
      <div className={FILTER_ROW}>
        <label className={`min-w-0 w-full flex-1 sm:max-w-md ${formSurface.fieldGroup}`}>
          <span className={formSurface.label}>Formulário</span>
          <select
            value={formId}
            onChange={(e) => onFormChange(e.target.value)}
            disabled={filtersDisabled || forms.length === 0}
            className={formSurface.inputSelect}
          >
            <option value={FAMI_ALL_FORMS}>Todos os formulários (visão institucional)</option>
            {forms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} (v{f.version})
              </option>
            ))}
          </select>
          <span className="text-micro leading-relaxed text-slate-500">
            Consolidado ou detalhe de um diagnóstico.
          </span>
        </label>

        <YearSelect
          id="fami-snapshot-year"
          className="w-full sm:w-44"
          label="Ano de referência"
          hint="Vazio = situação mais recente."
          years={availableYears}
          value={snapshotYear}
          onChange={onSnapshotYearChange}
          disabled={filtersDisabled}
        />

        <div
          className={`flex w-full flex-wrap items-center gap-2 sm:ms-auto sm:w-auto sm:shrink-0 ${ACTIONS_ROW_PT}`}
        >
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={`${formSurface.secondaryButtonSm} h-10`}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
            Atualizar
          </button>
          <button
            type="button"
            onClick={onExport}
            disabled={exportDisabled}
            className={`${formSurface.secondaryButtonSm} h-10`}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Exportar
          </button>
          <Link
            href="/respondente/portfolio-recomendacoes"
            className={`${formSurface.primaryButtonSm} h-10`}
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Recomendações
          </Link>
        </div>
      </div>
    </div>
  );
}
