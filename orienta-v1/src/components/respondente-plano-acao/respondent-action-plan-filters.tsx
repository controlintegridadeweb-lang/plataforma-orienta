"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import {
  STATUS_META,
  type ActionPlanView,
} from "@/lib/action-plans/respondent-presentation";

export type ActionPlanFilterValue = {
  search: string;
  view: ActionPlanView | "";
  responsible: string;
  formId: string;
  axisName: string;
  recommendationId: string;
  from: string;
  to: string;
  overdueOnly: boolean;
  withoutResponsible: boolean;
};

export type FormOption = { id: string; name: string };
export type AxisOption = { value: string; label: string };

type Props = {
  value: ActionPlanFilterValue;
  onChange: (next: ActionPlanFilterValue) => void;
  onClear: () => void;
  forms: FormOption[];
  axes: AxisOption[];
  resultCount?: number;
};

const VIEW_OPTIONS: ActionPlanView[] = [
  "not_started",
  "in_progress",
  "overdue",
  "completed",
  "paused",
  "no_plan",
];

function hasActive(v: ActionPlanFilterValue): boolean {
  return (
    v.search.trim().length > 0 ||
    Boolean(v.view) ||
    Boolean(v.responsible.trim()) ||
    Boolean(v.formId) ||
    Boolean(v.axisName) ||
    Boolean(v.recommendationId.trim()) ||
    Boolean(v.from) ||
    Boolean(v.to) ||
    v.overdueOnly ||
    v.withoutResponsible
  );
}

export function RespondentActionPlanFilters({
  value,
  onChange,
  onClear,
  forms,
  axes,
  resultCount,
}: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const active = hasActive(value);

  function patch(p: Partial<ActionPlanFilterValue>) {
    onChange({ ...value, ...p });
  }

  return (
    <section
      aria-label="Filtros do plano de ação"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
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
              placeholder="Buscar por ação, recomendação, responsável ou formulário..."
              className={`${formSurface.input} pl-9`}
            />
          </label>
          <button
            type="button"
            onClick={() => setExpandedMobile((s) => !s)}
            className={`${formSurface.secondaryButtonSm} sm:hidden`}
            aria-expanded={expandedMobile}
            aria-controls="action-plan-filters-grid"
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

        {value.recommendationId.trim() ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-100 bg-brand-50/60 px-3 py-2 text-xs text-slate-700">
            <span>
              Foco nesta recomendação. Lista e cartões mostram só as linhas ligadas a ela.
            </span>
            <button
              type="button"
              className={`${formSurface.secondaryButtonSm} whitespace-nowrap`}
              onClick={() => patch({ recommendationId: "" })}
            >
              Remover vínculo
            </button>
          </div>
        ) : null}

        <div
          id="action-plan-filters-grid"
          className={`${
            expandedMobile ? "grid" : "hidden"
          } grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
        >
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Status</span>
            <select
              className={formSurface.inputSelect}
              value={value.view}
              onChange={(e) => patch({ view: e.target.value as ActionPlanView | "" })}
            >
              <option value="">Todos</option>
              {VIEW_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {STATUS_META[v].label}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Responsável</span>
            <input
              type="text"
              className={formSurface.input}
              value={value.responsible}
              onChange={(e) => patch({ responsible: e.target.value })}
              placeholder="Nome ou área"
            />
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
            <span className={formSurface.label}>Prazo a partir de</span>
            <input
              type="date"
              className={formSurface.input}
              value={value.from}
              onChange={(e) => patch({ from: e.target.value })}
            />
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Prazo até</span>
            <input
              type="date"
              className={formSurface.input}
              value={value.to}
              onChange={(e) => patch({ to: e.target.value })}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-slate-200 text-brand focus:ring-brand/30"
                checked={value.overdueOnly}
                onChange={(e) => patch({ overdueOnly: e.target.checked })}
              />
              Somente atrasadas
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border border-slate-200 text-brand focus:ring-brand/30"
                checked={value.withoutResponsible}
                onChange={(e) => patch({ withoutResponsible: e.target.checked })}
              />
              Sem responsável
            </label>
          </div>
          {typeof resultCount === "number" ? (
            <p className="text-xs text-slate-500">
              {resultCount === 1
                ? "1 ação encontrada"
                : `${resultCount} ações encontradas`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
