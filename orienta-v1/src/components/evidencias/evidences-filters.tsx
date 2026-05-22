"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Filter, X } from "lucide-react";
import type { EvidenceFilterOptions } from "@/lib/evidences/admin-service";
import type { ValidationStatus } from "@/lib/evidences/schemas";
import { formSurface } from "@/lib/form-surface";
import { workflowStatusFilterOptions } from "@/lib/domain/status-registry";
import { STATUS_LABELS } from "./status-badge";

const STATUS_OPTIONS = workflowStatusFilterOptions("evidence_validation");

export type EvidencesFilterState = {
  formId: string;
  organizationId: string;
  status: "" | ValidationStatus;
  search: string;
  from: string;
  to: string;
};

type Props = {
  options: EvidenceFilterOptions | null;
  value: EvidencesFilterState;
  onChange: (next: EvidencesFilterState) => void;
  onClear: () => void;
  loading?: boolean;
};

export function EvidencesFilters({ options, value, onChange, onClear, loading }: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (value.formId) {
      const f = options?.forms.find((x) => x.id === value.formId);
      chips.push({
        key: "form",
        label: f ? `Formulario: ${f.name} (v${f.version})` : "Formulario",
        onRemove: () => onChange({ ...value, formId: "" }),
      });
    }
    if (value.organizationId) {
      const o = options?.organizations.find((x) => x.id === value.organizationId);
      chips.push({
        key: "org",
        label: o ? `Organizacao: ${o.name}` : "Organizacao",
        onRemove: () => onChange({ ...value, organizationId: "" }),
      });
    }
    if (value.status) {
      chips.push({
        key: "status",
        label: `Status: ${STATUS_LABELS[value.status]}`,
        onRemove: () => onChange({ ...value, status: "" }),
      });
    }
    if (value.search.trim()) {
      chips.push({
        key: "search",
        label: `Busca: "${value.search.trim()}"`,
        onRemove: () => onChange({ ...value, search: "" }),
      });
    }
    if (value.from) {
      chips.push({
        key: "from",
        label: `De: ${value.from.slice(0, 10)}`,
        onRemove: () => onChange({ ...value, from: "" }),
      });
    }
    if (value.to) {
      chips.push({
        key: "to",
        label: `Ate: ${value.to.slice(0, 10)}`,
        onRemove: () => onChange({ ...value, to: "" }),
      });
    }
    return chips;
  }, [options, value, onChange]);

  const grid = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4 lg:grid-cols-5 lg:gap-4">
      <label className={`${formSurface.fieldGroup} lg:col-span-2`}>
        <span className={formSurface.label}>Busca</span>
        <input
          type="search"
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          placeholder="Titulo, pergunta, orgao..."
          className={formSurface.input}
        />
      </label>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>Formulario</span>
        <select
          value={value.formId}
          onChange={(e) => onChange({ ...value, formId: e.target.value })}
          className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
        >
          <option value="">Todos</option>
          {options?.forms.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} (v{f.version})
            </option>
          ))}
        </select>
      </label>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>Organizacao</span>
        <select
          value={value.organizationId}
          onChange={(e) => onChange({ ...value, organizationId: e.target.value })}
          disabled={(options?.organizations.length ?? 0) <= 1}
          className={`${formSurface.inputSelect} font-normal normal-case tracking-normal disabled:cursor-not-allowed`}
        >
          <option value="">Todas</option>
          {options?.organizations.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>Status</span>
        <select
          value={value.status}
          onChange={(e) =>
            onChange({ ...value, status: e.target.value as "" | ValidationStatus })
          }
          className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
        >
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>De (data)</span>
        <input
          type="datetime-local"
          value={localFromIso(value.from)}
          onChange={(e) =>
            onChange({
              ...value,
              from: fromLocalValue(e.target.value),
            })
          }
          className={formSurface.input}
        />
      </label>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>Ate (data)</span>
        <input
          type="datetime-local"
          value={localFromIso(value.to)}
          onChange={(e) =>
            onChange({
              ...value,
              to: fromLocalValue(e.target.value),
            })
          }
          className={formSurface.input}
        />
      </label>
      <div className="flex min-h-11 w-full flex-col justify-end sm:col-span-2 sm:min-h-0 lg:col-span-1 lg:w-auto">
        <button
          type="button"
          onClick={onClear}
          disabled={activeChips.length === 0}
          className={`${formSurface.secondaryButtonSm} w-full min-h-10 disabled:opacity-50 sm:w-auto sm:min-h-9`}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Limpar
        </button>
      </div>
    </div>
  );

  return (
    <div className={formSurface.card}>
      <div
        className={`${formSurface.cardHeader} flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-white px-4 py-3 sm:px-5`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-700 ring-1 ring-brand-100">
            <Filter className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Filtros</p>
            <p className="text-xs text-slate-600">Refine a fila antes de validar.</p>
          </div>
        </div>
        <button
          type="button"
          className={`inline-flex items-center gap-1 md:hidden ${formSurface.ghostButton}`}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? "Ocultar" : "Mostrar"}
          <ChevronDown
            className={`h-4 w-4 transition ${mobileOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      <div
        className={
          mobileOpen
            ? `${formSurface.body} border-t border-slate-100`
            : `hidden md:block ${formSurface.body}`
        }
      >
        {grid}
        {loading ? (
          <p className="text-xs text-slate-500">Atualizando lista...</p>
        ) : null}
      </div>
      {activeChips.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3 sm:px-5">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Ativos
          </span>
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.onRemove}
              className={`${formSurface.chip.base} ${formSurface.chip.neutral} pr-1`}
            >
              {chip.label}
              <X className="h-3 w-3" aria-hidden />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function localFromIso(iso: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalValue(local: string): string {
  if (!local) return "";
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}
