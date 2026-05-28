"use client";

import { FamiMaturityIllustration } from "@/components/fami/fami-maturity-illustration";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { formatFamiUpdatedAt } from "@/lib/fami/format-updated-at";
import { RespondentFamiLevelBadge } from "./respondent-fami-level-badge";

type Props = {
  organizationName: string;
  formsCount: number;
  percentage: number | null;
  level: number | null;
  pointsObtained?: number;
  pointsPossible?: number;
  lastProcessedAt: string | null;
};

export function RespondentFamiInstitutionalCard({
  organizationName,
  formsCount,
  percentage,
  level,
  pointsObtained,
  pointsPossible,
  lastProcessedAt,
}: Props) {
  const hasScore = percentage != null && level != null;

  return (
    <section
      className={`${formSurface.dashboardPanel} overflow-hidden bg-gradient-to-br from-white via-white to-brand-50/25`}
      aria-label="Maturidade institucional geral"
    >
      <div className="flex flex-col gap-8 p-6 sm:p-8 lg:flex-row lg:items-center lg:gap-10 xl:gap-14">
        <div className="flex shrink-0 items-center justify-center lg:justify-start">
          <FamiMaturityIllustration className="h-36 w-auto sm:h-40 lg:h-44" />
        </div>

        <div className="min-w-0 flex-1 space-y-4">
          <div>
            <p className={typography.panelEyebrow}>Pontuação FAMI</p>
            <h2 className={typography.panelHeroTitle}>Maturidade institucional geral</h2>
            <p className={typography.panelHeroLead}>
              {organizationName || "Organização"} — média do último cálculo de cada diagnóstico
              ativo ({formsCount} formulário{formsCount === 1 ? "" : "s"}). Consulte o guia a
              seguir e use os filtros para aprofundar em um formulário específico.
            </p>
          </div>

          {hasScore && level != null ? (
            <div className="flex flex-wrap items-center gap-2">
              <RespondentFamiLevelBadge level={level} size="md" />
              {typeof pointsObtained === "number" && typeof pointsPossible === "number" ? (
                <span className={typography.meta}>
                  {pointsObtained.toFixed(2)} / {pointsPossible.toFixed(2)} pontos elegíveis
                  (soma entre formulários)
                </span>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-slate-600">
              Ainda não há pontuação consolidada. Conclua ao menos um diagnóstico com cálculo FAMI.
            </p>
          )}

          <p className={typography.meta} role="status">
            Última atualização consolidada:{" "}
            <time className="font-medium text-slate-700" dateTime={lastProcessedAt ?? undefined}>
              {formatFamiUpdatedAt(lastProcessedAt)}
            </time>
          </p>
        </div>
      </div>
    </section>
  );
}
