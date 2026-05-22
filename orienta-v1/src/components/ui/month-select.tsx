"use client";

import { formSurface } from "@/lib/form-surface";
import { brtMonthLabel } from "@/lib/fami/fami-year";

type Props = {
  id?: string;
  label: string;
  hint?: string;
  /** Mês civil 1–12 */
  value: number;
  onChange: (next: number) => void;
  disabled?: boolean;
};

export function MonthSelect({ id, label, hint, value, onChange, disabled }: Props) {
  return (
    <label className="flex min-w-[140px] flex-1 flex-col gap-1" htmlFor={id}>
      <span className={formSurface.label}>{label}</span>
      <select
        id={id}
        value={String(value)}
        disabled={disabled}
        className={formSurface.inputSelect}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={hint ? `${id ?? "month"}-hint` : undefined}
      >
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
          <option key={m} value={m}>
            {brtMonthLabel(m)}
          </option>
        ))}
      </select>
      {hint ? (
        <span id={`${id ?? "month"}-hint`} className="text-[11px] text-slate-500">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
