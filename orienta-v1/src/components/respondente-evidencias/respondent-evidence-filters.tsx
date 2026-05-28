"use client";

import { useState } from "react";
import { ChevronDown, Filter, Search, X } from "lucide-react";
import { RESPONDENT_STATUS_META, type RespondentEvidenceStatus } from "@/lib/evidences/respondent-status";
import { formSurface } from "@/lib/form-surface";

export type RespondentFilterValue = {
  search: string;
  formId: string;
  status: "" | RespondentEvidenceStatus;
  from: string;
  to: string;
  pendingOnly: boolean;
};

export type FormOption = { id: string; name: string };

type Props = {
  value: RespondentFilterValue;
  onChange: (next: RespondentFilterValue) => void;
  onClear: () => void;
  forms: FormOption[];
  resultCount?: number;
};

const STATUS_OPTIONS: RespondentEvidenceStatus[] = [
  "aprovada",
  "aguardando_analise",
  "ajustada_e_reenviada",
  "reprovada",
  "complementacao_solicitada",
];

function hasActive(value: RespondentFilterValue): boolean {
  return (
    value.search.trim().length > 0 ||
    Boolean(value.formId) ||
    Boolean(value.status) ||
    Boolean(value.from) ||
    Boolean(value.to) ||
    value.pendingOnly
  );
}

export function RespondentEvidenceFilters({
  value,
  onChange,
  onClear,
  forms,
  resultCount,
}: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const active = hasActive(value);

  function patch(p: Partial<RespondentFilterValue>) {
    onChange({ ...value, ...p });
  }

  return (
    <section
      aria-label="Filtros de evidências"
      className="rounded-xl border border-slate-200 bg-white shadow-sm"
    >
      <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-56 flex-1">
            <span className="sr-only">Buscar</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={value.search}
              onChange={(e) => patch({ search: e.target.value })}
              placeholder="Título, pergunta, formulário..."
              className={`${formSurface.input} pl-9`}
            />
          </label>
          <button
            type="button"
            onClick={() => setExpandedMobile((s) => !s)}
            className={`${formSurface.secondaryButtonSm} sm:hidden`}
            aria-expanded={expandedMobile}
            aria-controls="evidence-filters-grid"
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
          id="evidence-filters-grid"
          className={`${
            expandedMobile ? "grid" : "hidden"
          } grid-cols-1 gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4`}
        >
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formulário</span>
            <select
              value={value.formId}
              onChange={(e) => patch({ formId: e.target.value })}
              className={formSurface.inputSelect}
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
            <span className={formSurface.label}>Status</span>
            <select
              value={value.status}
              onChange={(e) =>
                patch({ status: e.target.value as "" | RespondentEvidenceStatus })
              }
              className={formSurface.inputSelect}
            >
              <option value="">Todos</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {RESPONDENT_STATUS_META[s].label}
                </option>
              ))}
            </select>
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Enviado a partir de</span>
            <input
              type="date"
              value={value.from ? value.from.slice(0, 10) : ""}
              onChange={(e) =>
                patch({
                  from: e.target.value
                    ? new Date(`${e.target.value}T00:00:00`).toISOString()
                    : "",
                })
              }
              className={formSurface.input}
            />
          </label>

          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Enviado até</span>
            <input
              type="date"
              value={value.to ? value.to.slice(0, 10) : ""}
              onChange={(e) =>
                patch({
                  to: e.target.value
                    ? new Date(`${e.target.value}T23:59:59`).toISOString()
                    : "",
                })
              }
              className={formSurface.input}
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={value.pendingOnly}
              onChange={(e) => patch({ pendingOnly: e.target.checked })}
              className="h-4 w-4 rounded border border-slate-200 text-brand focus:ring-brand/30"
            />
            Somente pendências (preciso de ação)
          </label>
          {typeof resultCount === "number" ? (
            <p className="text-xs text-slate-500">
              {resultCount === 1
                ? "1 evidência encontrada"
                : `${resultCount} evidências encontradas`}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
