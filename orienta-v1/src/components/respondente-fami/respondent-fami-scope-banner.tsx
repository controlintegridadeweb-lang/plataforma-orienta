"use client";

import { FamiScoreRing } from "@/components/fami/fami-score-ring";
import { formSurface } from "@/lib/form-surface";
import { formatFamiUpdatedAt } from "@/lib/fami/format-updated-at";
import { RespondentFamiLevelBadge } from "./respondent-fami-level-badge";

type Props = {
  formName: string;
  formVersion: number;
  percentage: number | null;
  level: number | null;
  lastProcessedAt: string | null;
};

export function RespondentFamiScopeBanner({
  formName,
  formVersion,
  percentage,
  level,
  lastProcessedAt,
}: Props) {
  const hasScore = percentage != null && level != null;

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-card)] sm:flex-row sm:items-center sm:gap-6 sm:p-5"
      role="status"
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Score específico do diagnóstico
        </p>
        <h3 className="text-lg font-medium tracking-normal text-slate-900 sm:text-xl">
          {formName}
          <span className="ml-1.5 text-base font-normal text-slate-500">v{formVersion}</span>
        </h3>
        <p className="max-w-2xl text-sm leading-snug text-slate-600">
          Os indicadores e a análise detalhada abaixo referem-se apenas a este formulário.
        </p>
        <p className="text-xs text-slate-500">
          Atualizado:{" "}
          <time className="font-medium text-slate-700" dateTime={lastProcessedAt ?? undefined}>
            {formatFamiUpdatedAt(lastProcessedAt)}
          </time>
        </p>
      </div>

      {hasScore && level != null && percentage != null ? (
        <div className="flex shrink-0 items-center gap-3 sm:gap-4">
          <FamiScoreRing percentage={percentage} level={level} emphasizePercent />
          <RespondentFamiLevelBadge level={level} size="md" />
        </div>
      ) : (
        <p className={`${formSurface.messageWarning} shrink-0 text-xs sm:max-w-[12rem]`}>
          Sem pontuação calculada para este formulário.
        </p>
      )}
    </div>
  );
}
