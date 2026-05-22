import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { RespondentProgress } from "@/lib/dashboards/queries";
import { formStateLabelPt } from "@/lib/respondent/form-labels";
import { formSurface } from "@/lib/form-surface";

type Props = {
  form: RespondentProgress;
  /** `row`: lista compacta no dashboard; `card`: item destacado na página dedicada. */
  variant?: "row" | "card";
};

export function RespondentFormProgressItem({ form, variant = "row" }: Props) {
  const pct =
    form.totalQuestions > 0
      ? Math.round((form.answeredQuestions / form.totalQuestions) * 100)
      : 0;
  const done = pct === 100;

  const content = (
    <>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <p
          className={
            variant === "card"
              ? "truncate text-base font-semibold text-slate-900"
              : "truncate text-sm font-semibold text-slate-900"
          }
        >
          {form.formName || "Formulário"}
        </p>
        {done ? (
          <span className={`${formSurface.badge.base} ${formSurface.badge.success}`}>
            Concluído
          </span>
        ) : (
          <span className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}>
            {formStateLabelPt(form.state)}
          </span>
        )}
        {form.complementationRequests > 0 ? (
          <span className={`${formSurface.badge.base} ${formSurface.badge.danger}`}>
            {form.complementationRequests} pendência
            {form.complementationRequests > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>Progresso</span>
          <span className="shrink-0 tabular-nums font-medium text-slate-600">
            {form.answeredQuestions}/{form.totalQuestions} · {pct}%
          </span>
        </div>
        <div
          className={`overflow-hidden rounded-full bg-slate-100 ${
            variant === "card" ? "h-2" : "h-1.5"
          }`}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progresso: ${pct}%`}
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              done ? "bg-emerald-500" : "bg-brand-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </>
  );

  const action = (
    <Link
      href={`/respondente/formularios/${form.formId}`}
      className={`${formSurface.primaryButtonSm} shrink-0 ${
        variant === "card" ? "w-full justify-center sm:w-auto" : ""
      }`}
    >
      {done ? "Revisar" : "Responder"}
      <ArrowRight className="h-3.5 w-3.5" aria-hidden />
    </Link>
  );

  if (variant === "card") {
    return (
      <li className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-[var(--shadow-card)] transition hover:border-slate-300 hover:shadow-[var(--shadow-card-hover)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5">
          <div className="min-w-0 flex-1 space-y-3">{content}</div>
          {action}
        </div>
      </li>
    );
  }

  return (
    <li className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1 space-y-2">{content}</div>
      {action}
    </li>
  );
}
