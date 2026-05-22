"use client";

import { useId } from "react";
import {
  RESPONDENT_STATUS_LABEL,
  RESPONDENT_STATUS_VALUES,
  type AnswersListFilters,
  type RespondentFilterOptions,
  type RespondentStatus,
} from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/form-surface";

type Props = {
  filters: AnswersListFilters;
  options: RespondentFilterOptions | null;
  onChange: (next: AnswersListFilters) => void;
  onClear: () => void;
};

function isStatus(value: string): value is RespondentStatus {
  return (RESPONDENT_STATUS_VALUES as readonly string[]).includes(value);
}

export function AnswersFilters({ filters, options, onChange, onClear }: Props) {
  const orgId = useId();
  const statusId = useId();
  const fromId = useId();
  const toId = useId();

  const hasActiveFilter =
    Boolean(filters.organizationId) ||
    Boolean(filters.status) ||
    Boolean(filters.from) ||
    Boolean(filters.to);

  return (
    <section
      aria-label="Filtros das respostas"
      className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className={formSurface.fieldGroup}>
          <label htmlFor={orgId} className={formSurface.label}>
            Orgao
          </label>
          <select
            id={orgId}
            className={formSurface.inputSelect}
            value={filters.organizationId ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                organizationId: e.target.value || null,
              })
            }
          >
            <option value="">Todos os orgaos</option>
            {(options?.organizations ?? []).map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>

        <div className={formSurface.fieldGroup}>
          <label htmlFor={statusId} className={formSurface.label}>
            Status
          </label>
          <select
            id={statusId}
            className={formSurface.inputSelect}
            value={filters.status ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              onChange({
                ...filters,
                status: v && isStatus(v) ? v : null,
              });
            }}
          >
            <option value="">Todos os status</option>
            {RESPONDENT_STATUS_VALUES.map((s) => (
              <option key={s} value={s}>
                {RESPONDENT_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>

        <div className={formSurface.fieldGroup}>
          <label htmlFor={fromId} className={formSurface.label}>
            De
          </label>
          <input
            id={fromId}
            type="date"
            className={formSurface.input}
            value={filters.from ?? ""}
            onChange={(e) => onChange({ ...filters, from: e.target.value || null })}
          />
        </div>

        <div className={formSurface.fieldGroup}>
          <label htmlFor={toId} className={formSurface.label}>
            Ate
          </label>
          <input
            id={toId}
            type="date"
            className={formSurface.input}
            value={filters.to ?? ""}
            onChange={(e) => onChange({ ...filters, to: e.target.value || null })}
          />
        </div>
      </div>

      {hasActiveFilter ? (
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClear}
            className={formSurface.ghostButton}
          >
            Limpar filtros
          </button>
        </div>
      ) : null}
    </section>
  );
}
