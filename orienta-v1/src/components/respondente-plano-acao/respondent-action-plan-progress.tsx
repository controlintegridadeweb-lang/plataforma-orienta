"use client";

import { PROGRESS_STEPS, type ProgressStep } from "@/lib/action-plans/respondent-presentation";

type BarProps = {
  value: number;
  label?: string;
  size?: "sm" | "md";
};

export function RespondentActionPlanProgress({ value, label, size = "md" }: BarProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));
  const tone =
    clamped >= 100
      ? "bg-emerald-500"
      : clamped >= 55
        ? "bg-sky-500"
        : clamped > 0
          ? "bg-amber-500"
          : "bg-slate-300";
  const height = size === "sm" ? "h-1.5" : "h-2";

  return (
    <div className="w-full space-y-1">
      {label ? (
        <div className="flex items-center justify-between text-[11px] font-medium text-slate-500">
          <span>{label}</span>
          <span className="tabular-nums text-slate-700">{clamped}%</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        className={`relative w-full overflow-hidden rounded-full bg-slate-100 ${height}`}
      >
        <div
          className={`${tone} ${height} rounded-full transition-[width] duration-300 ease-out`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

type StepsProps = {
  value: ProgressStep | number;
  onChange: (next: ProgressStep) => void;
  disabled?: boolean;
};

/**
 * Atalhos visuais 0/25/50/75/100. Cada passo dispara um callback que o
 * formulario do plano traduz para o `PlanStatus` correspondente.
 */
export function RespondentActionPlanProgressSteps({
  value,
  onChange,
  disabled,
}: StepsProps) {
  const current = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className="inline-flex items-center gap-1.5"
      role="group"
      aria-label="Atalhos de progresso"
    >
      {PROGRESS_STEPS.map((step) => {
        const active = current === step;
        return (
          <button
            key={step}
            type="button"
            disabled={disabled}
            aria-pressed={active}
            onClick={() => onChange(step)}
            className={`inline-flex h-8 min-w-[44px] items-center justify-center rounded-md border px-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-300 disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-brand-400 bg-brand-50 text-brand-800 shadow-sm"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {step}%
          </button>
        );
      })}
    </div>
  );
}
