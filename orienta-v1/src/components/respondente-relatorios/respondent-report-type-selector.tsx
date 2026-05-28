"use client";

import { formSurface } from "@/lib/layout/form-surface";
import type { RespondentReportKind } from "@/lib/reports/respondent-presentation";
import { REPORT_KIND_META, REPORT_KIND_ORDER } from "@/lib/reports/respondent-presentation";

type Props = {
  value: RespondentReportKind;
  onChange: (kind: RespondentReportKind) => void;
};

export function RespondentReportTypeSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-2">
      <p className={formSurface.label}>Tipo de relatório</p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {REPORT_KIND_ORDER.map((id) => {
          const meta = REPORT_KIND_META[id];
          const Icon = meta.icon;
          const active = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              title={`${meta.label} · ${meta.scope}`}
              className={`group flex gap-3 rounded-xl border p-3 text-left shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover ${
                active
                  ? "border-brand-300 bg-brand-50/80 ring-2 ring-brand-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  active ? "bg-brand-100 text-brand-800" : "bg-slate-100 text-slate-600"
                }`}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-slate-900">{meta.label}</span>
                <span className="mt-0.5 line-clamp-2 text-micro leading-snug text-slate-500">
                  {meta.shortDescription}
                </span>
                <span className="mt-1 block text-2xs font-medium text-slate-400">
                  Escopo: {meta.scope}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
