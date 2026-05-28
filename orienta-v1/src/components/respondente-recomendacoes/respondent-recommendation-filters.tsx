"use client";

import { ChevronDown, Filter, Search, X } from "lucide-react";
import { useState } from "react";
import { formSurface } from "@/lib/form-surface";
import {
  RESPONDENT_VIEW_META,
  type RespondentRecommendationView,
} from "@/lib/recommendations/respondent-presentation";

export type RespondentRecommendationFilterValue = {
  search: string;
  view: RespondentRecommendationView | "";
  formId: string;
  axisName: string;
  withPlan: "all" | "with" | "without";
  pendingOnly: boolean;
};

export type FormOption = { id: string; name: string };
export type AxisOption = { value: string; label: string };

type Props = {
  value: RespondentRecommendationFilterValue;
  onChange: (next: RespondentRecommendationFilterValue) => void;
  onClear: () => void;
  forms: FormOption[];
  axes: AxisOption[];
  resultCount?: number;
};

const VIEW_OPTIONS: RespondentRecommendationView[] = [
  "awaiting_action",
  "in_progress",
  "resolved",
  "dismissed",
];

function hasActive(value: RespondentRecommendationFilterValue): boolean {
  return (
    value.search.trim().length > 0 ||
    Boolean(value.view) ||
    Boolean(value.formId) ||
    Boolean(value.axisName) ||
    value.withPlan !== "all" ||
    value.pendingOnly
  );
}

export function RespondentRecommendationFilters({
  value,
  onChange,
  onClear,
  forms,
  axes,
  resultCount,
}: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const active = hasActive(value);

  function patch(p: Partial<RespondentRecommendationFilterValue>) {
    onChange({ ...value, ...p });
  }

  return (
    <section
      aria-label="Filtros de recomendações"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative flex-1 min-w-56">
            <span className="sr-only">Buscar</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={value.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder="Buscar por texto, eixo, seção ou formulário..."
              className={`${formSurface.input} pl-9`}
            />
          </label>
          <button
            type="button"
            onClick={() => setExpandedMobile((s) => !s)}
            className={`${formSurface.secondaryButtonSm} sm:hidden`}
            aria-expanded={expandedMobile}
            aria-controls="recommendation-filters-grid"
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
              Limpar
            </button>
          ) : null}
        </div>

        <div
          id="recommendation-filters-grid"
          className={`${
            expandedMobile ? "grid" : "hidden"
          } grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5`}
        >
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Status</span>
            <select
              className={formSurface.inputSelect}
              value={value.view}
              onChange={(e) =>
                patch({ view: e.target.value as RespondentRecommendationView | "" })
              }
            >
              <option value="">Todos</option>
              {VIEW_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {RESPONDENT_VIEW_META[s].label}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formulário</span>
            <select
              className={formSurface.inputSelect}
              value={value.formId}
              onChange={(e) => patch({ formId: e.target.value })}
            >
              <option value="">Todos</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Eixo</span>
            <select
              className={formSurface.inputSelect}
              value={value.axisName}
              onChange={(e) => patch({ axisName: e.target.value })}
            >
              <option value="">Todos</option>
              {axes.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Plano de ação</span>
            <select
              className={formSurface.inputSelect}
              value={value.withPlan}
              onChange={(e) =>
                patch({ withPlan: e.target.value as "all" | "with" | "without" })
              }
            >
              <option value="all">Todas</option>
              <option value="with">Somente vinculadas</option>
              <option value="without">Somente sem plano</option>
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border border-slate-200 text-brand focus:ring-brand/30"
              checked={value.pendingOnly}
              onChange={(e) => patch({ pendingOnly: e.target.checked })}
            />
            Somente pendentes de ação
          </label>
          {typeof resultCount === "number" ? (
            <p className="text-xs text-slate-500">
              {resultCount === 1
                ? "1 recomendação encontrada"
                : `${resultCount} recomendações encontradas`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
