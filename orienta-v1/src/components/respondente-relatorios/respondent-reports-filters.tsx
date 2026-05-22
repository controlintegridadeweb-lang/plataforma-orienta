"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import { YearSelect } from "@/components/ui/year-select";
import type { RespondentReportFormat, RespondentReportKind } from "@/lib/reports/respondent-presentation";
import {
  REPORT_FORMAT_META,
  REPORT_KIND_ORDER,
  REPORT_KIND_META,
} from "@/lib/reports/respondent-presentation";

export type HistoryFilterState = {
  search: string;
  kind: RespondentReportKind | "";
  format: RespondentReportFormat | "";
  status: "" | "completed" | "outdated";
  from: string;
  to: string;
  /** Preset BRT: período igual ao ano civil (alinhado aos filtros date) */
  yearPreset: number | null;
};

export const INITIAL_HISTORY_FILTERS: HistoryFilterState = {
  search: "",
  kind: "",
  format: "",
  status: "",
  from: "",
  to: "",
  yearPreset: null,
};

export function hasActiveHistoryFilters(value: HistoryFilterState): boolean {
  return (
    value.search.trim().length > 0 ||
    Boolean(value.kind) ||
    Boolean(value.format) ||
    Boolean(value.status) ||
    Boolean(value.from) ||
    Boolean(value.to) ||
    value.yearPreset != null
  );
}

type Props = {
  value: HistoryFilterState;
  onChange: (next: HistoryFilterState) => void;
  onClear: () => void;
  availableYears: number[];
};

export function RespondentReportsFilters({ value, onChange, onClear, availableYears }: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const active = useMemo(() => hasActiveHistoryFilters(value), [value]);

  function patch(p: Partial<HistoryFilterState>) {
    onChange({ ...value, ...p });
  }

  return (
    <section
      aria-label="Filtros do histórico"
      className="rounded-xl border border-slate-200/80 bg-slate-50/40 shadow-[var(--shadow-card)]"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[14rem] flex-1">
            <span className="sr-only">Buscar</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={value.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder="Nome do formulário…"
              className={`${formSurface.input} pl-9`}
            />
          </label>
          <button
            type="button"
            onClick={() => setExpandedMobile((s) => !s)}
            className={`${formSurface.secondaryButtonSm} sm:hidden`}
            aria-expanded={expandedMobile}
            aria-controls="reports-history-filters-grid"
          >
            <Filter className="h-3.5 w-3.5" aria-hidden />
            Filtros
            <ChevronDown
              className={`h-3.5 w-3.5 transition ${expandedMobile ? "rotate-180" : ""}`}
              aria-hidden
            />
          </button>
          {active ? (
            <button
              type="button"
              onClick={onClear}
              className={`${formSurface.ghostButton} text-rose-700 hover:bg-rose-50`}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Limpar filtros
            </button>
          ) : null}
        </div>

        <div
          id="reports-history-filters-grid"
          className={`${
            expandedMobile ? "grid" : "hidden"
          } grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
        >
          <YearSelect
            id="reports-history-year"
            label="Ano"
            hint="Preenche de/até pelo ano civil (BRT)."
            years={availableYears}
            value={value.yearPreset}
            onChange={(y) =>
              patch({
                yearPreset: y,
                ...(y != null ? { from: `${y}-01-01`, to: `${y}-12-31` } : { from: "", to: "" }),
              })
            }
          />

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Tipo</span>
            <select
              value={value.kind}
              onChange={(e) => patch({ kind: e.target.value as RespondentReportKind | "" })}
              className={formSurface.inputSelect}
            >
              <option value="">Todos</option>
              {REPORT_KIND_ORDER.map((id) => (
                <option key={id} value={id}>
                  {REPORT_KIND_META[id].label}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formato</span>
            <select
              value={value.format}
              onChange={(e) =>
                patch({ format: e.target.value as RespondentReportFormat | "" })
              }
              className={formSurface.inputSelect}
            >
              <option value="">Todos</option>
              {Object.values(REPORT_FORMAT_META).map((f) => (
                <option key={f.id} value={f.id} disabled={!f.available}>
                  {f.label} {!f.available ? " (em breve)" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Status</span>
            <select
              value={value.status}
              onChange={(e) =>
                patch({ status: e.target.value as HistoryFilterState["status"] })
              }
              className={formSurface.inputSelect}
            >
              <option value="">Todos</option>
              <option value="completed">Gerado</option>
              <option value="outdated">Desatualizado</option>
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>De</span>
            <input
              type="date"
              value={value.from}
              onChange={(e) => patch({ yearPreset: null, from: e.target.value })}
              className={formSurface.input}
            />
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Até</span>
            <input
              type="date"
              value={value.to}
              onChange={(e) => patch({ yearPreset: null, to: e.target.value })}
              className={formSurface.input}
            />
          </label>
        </div>
      </div>
    </section>
  );
}
