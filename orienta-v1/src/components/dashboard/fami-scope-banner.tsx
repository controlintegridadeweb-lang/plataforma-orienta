"use client";

import { CalendarClock, Info, Lock, LockOpen } from "lucide-react";

export type FamiScopeBannerProps = {
  scope: "global" | "organization";
  formName: string | null;
  formState: string | null;
  isOfficialScore: boolean;
  applicableQuestions: number;
  waivedQuestions: number;
  snapshotYearApplied: number | null;
  reprocessedAt: string | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FamiScopeBanner({
  scope,
  formName,
  formState,
  isOfficialScore,
  applicableQuestions,
  waivedQuestions,
  snapshotYearApplied,
  reprocessedAt,
}: FamiScopeBannerProps) {
  if (scope === "global") {
    return (
      <div className="inline-flex flex-wrap items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
        <Info className="h-3.5 w-3.5 text-slate-500" aria-hidden />
        Visão agregada: média entre organizações com FAMI calculado no encerramento
        {snapshotYearApplied != null ? ` (fechamento ${snapshotYearApplied})` : ""}.
      </div>
    );
  }

  const reprocessed = formatDate(reprocessedAt);
  const isReopened = isOfficialScore && formState !== "closed";
  const label = !isOfficialScore
    ? "FAMI pendente — calculado ao encerrar o ciclo"
    : isReopened
      ? "FAMI oficial · ciclo reaberto"
      : "FAMI oficial";
  const Icon = isOfficialScore ? (isReopened ? LockOpen : Lock) : Info;
  const tone = isOfficialScore
    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
    : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border px-3 py-1.5 text-xs ${tone}`}>
      <span className="inline-flex items-center gap-1 font-semibold">
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {label}
      </span>
      {formName ? <span>· {formName}</span> : null}
      {formState ? <span className="opacity-80">· estado: {formState}</span> : null}
      {isOfficialScore ? (
        <span>
          · {applicableQuestions} perguntas aplicáveis
          {waivedQuestions > 0 ? `, ${waivedQuestions} dispensada${waivedQuestions === 1 ? "" : "s"}` : ""}
        </span>
      ) : null}
      {reprocessed && isOfficialScore ? (
        <span className="inline-flex items-center gap-1 opacity-80">
          <CalendarClock className="h-3 w-3" aria-hidden />
          calculado em {reprocessed}
        </span>
      ) : null}
    </div>
  );
}
