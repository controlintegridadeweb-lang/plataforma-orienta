"use client";

import { ChevronDown, Filter, Search, X } from "lucide-react";
import {
  STATUS_META,
  type AdminRecommendationView,
} from "@/lib/recommendations/admin-presentation";
import { formSurface } from "@/lib/form-surface";

export type AdminFiltersState = {
  search: string;
  organizationId: string;
  formId: string;
  axisId: string;
  view: "" | AdminRecommendationView;
  from: string;
  to: string;
};

export const initialAdminFilters: AdminFiltersState = {
  search: "",
  organizationId: "",
  formId: "",
  axisId: "",
  view: "",
  from: "",
  to: "",
};

type Option = { id: string; label: string };

type Props = {
  value: AdminFiltersState;
  organizations: Option[];
  forms: Option[];
  axes: Option[];
  onChange: (next: AdminFiltersState) => void;
  loading?: boolean;
};

const fieldLabel = formSurface.label;
const fieldInput = formSurface.input;
const fieldSelect = formSurface.inputSelect;

const VIEW_OPTIONS: { value: "" | AdminRecommendationView; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "open", label: STATUS_META.open.label },
  { value: "awaiting_plan", label: STATUS_META.awaiting_plan.label },
  { value: "plan_submitted", label: STATUS_META.plan_submitted.label },
  { value: "in_execution", label: STATUS_META.in_execution.label },
  { value: "overdue", label: STATUS_META.overdue.label },
  { value: "in_review", label: STATUS_META.in_review.label },
  { value: "completed", label: STATUS_META.completed.label },
  { value: "dismissed", label: STATUS_META.dismissed.label },
];

function countPanelFilters(v: AdminFiltersState, orgOnSurface: boolean): number {
  let n = 0;
  if (!orgOnSurface && v.organizationId) n += 1;
  if (v.formId) n += 1;
  if (v.axisId) n += 1;
  if (v.view) n += 1;
  if (v.from) n += 1;
  if (v.to) n += 1;
  return n;
}

export function AdminRecommendationFilters({
  value,
  organizations,
  forms,
  axes,
  onChange,
}: Props) {
  function set<K extends keyof AdminFiltersState>(key: K, v: AdminFiltersState[K]) {
    onChange({ ...value, [key]: v });
  }

  function clearAll() {
    onChange({ ...initialAdminFilters });
  }

  const orgOnSurface = organizations.length > 1;

  const isDirty =
    value.search !== initialAdminFilters.search ||
    value.organizationId !== initialAdminFilters.organizationId ||
    value.formId !== initialAdminFilters.formId ||
    value.axisId !== initialAdminFilters.axisId ||
    value.view !== initialAdminFilters.view ||
    value.from !== initialAdminFilters.from ||
    value.to !== initialAdminFilters.to;

  const panelCount = countPanelFilters(value, orgOnSurface);

  return (
    <div className={`overflow-hidden ${formSurface.dashboardPanel}`}>
      <div className="space-y-3 p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] xl:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <label className={`${formSurface.fieldGroup} block min-w-0`}>
            <span className={fieldLabel}>Busca</span>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={value.search}
                onChange={(e) => set("search", e.target.value)}
                placeholder="Recomendação, pergunta, eixo ou organização…"
                className={`${fieldInput} py-2 pl-9`}
              />
            </div>
          </label>

          {orgOnSurface ? (
            <label className={`${formSurface.fieldGroup} block min-w-0`}>
              <span className={fieldLabel}>Organização</span>
              <select
                value={value.organizationId}
                onChange={(e) => set("organizationId", e.target.value)}
                className={fieldSelect}
              >
                <option value="">Todas</option>
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className={`${formSurface.fieldGroup} block min-w-0`}>
            <span className={fieldLabel}>Formulário</span>
            <select
              value={value.formId}
              onChange={(e) => set("formId", e.target.value)}
              className={fieldSelect}
            >
              <option value="">Todos</option>
              {forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>

          <label className={`${formSurface.fieldGroup} block min-w-0`}>
            <span className={fieldLabel}>Eixo</span>
            <select
              value={value.axisId}
              onChange={(e) => set("axisId", e.target.value)}
              className={fieldSelect}
            >
              <option value="">Todos</option>
              {axes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label}
                </option>
              ))}
            </select>
          </label>

          <label className={`${formSurface.fieldGroup} block min-w-0`}>
            <span className={fieldLabel}>Status</span>
            <select
              value={value.view}
              onChange={(e) => set("view", e.target.value as AdminFiltersState["view"])}
              className={fieldSelect}
            >
              {VIEW_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <details className="group">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/50 px-3 py-2 text-sm font-medium text-slate-700 outline-none marker:hidden hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <Filter className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <span className="min-w-0 flex-1">
              Período (opcional)
              {panelCount > 0 ? (
                <span className="ml-1.5 tabular-nums font-normal text-slate-500">
                  ({panelCount})
                </span>
              ) : null}
            </span>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180"
              aria-hidden
            />
          </summary>

          <div className="mt-2 grid gap-3 rounded-xl border border-slate-200/80 bg-slate-50/30 p-3 sm:grid-cols-2 sm:p-4">
            {!orgOnSurface ? (
              <label className={formSurface.fieldGroup}>
                <span className={fieldLabel}>Organização</span>
                <select
                  value={value.organizationId}
                  onChange={(e) => set("organizationId", e.target.value)}
                  disabled={organizations.length <= 1}
                  className={`${fieldSelect} disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  <option value="">Todas</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            <label className={formSurface.fieldGroup}>
              <span className={fieldLabel}>Período — de</span>
              <input
                type="date"
                value={value.from}
                onChange={(e) => set("from", e.target.value)}
                className={fieldInput}
              />
            </label>
            <label className={formSurface.fieldGroup}>
              <span className={fieldLabel}>até</span>
              <input
                type="date"
                value={value.to}
                onChange={(e) => set("to", e.target.value)}
                className={fieldInput}
              />
            </label>
          </div>
        </details>

        {isDirty ? (
          <div className="flex justify-end border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={clearAll}
              className={`${formSurface.secondaryButtonSm} gap-1.5 text-xs`}
            >
              <X className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Limpar filtros
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
