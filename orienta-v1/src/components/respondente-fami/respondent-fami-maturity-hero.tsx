"use client";

import type { ReactNode } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  ClipboardList,
  Flame,
  Minus,
  ShieldCheck,
} from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { FamiMaturityIllustration } from "@/components/fami/fami-maturity-illustration";
import { FamiScoreRing } from "@/components/fami/fami-score-ring";
import { typography } from "@/lib/design-system";
import { formatFamiUpdatedAt } from "@/lib/fami/format-updated-at";
import type { EvolutionDelta } from "@/lib/fami/respondent-presentation";
import { RespondentFamiFilters } from "./respondent-fami-filters";
import { RespondentFamiLevelBadge } from "./respondent-fami-level-badge";

type FormOpt = { id: string; name: string; version: number };

type Props = {
  organizationName: string;
  forms: FormOpt[];
  formId: string;
  onFormChange: (id: string) => void;
  availableYears: number[];
  snapshotYear: number | null;
  onSnapshotYearChange: (y: number | null) => void;
  percentage: number | null;
  level: number | null;
  pointsObtained?: number;
  pointsPossible?: number;
  delta: EvolutionDelta;
  lastProcessedAt: string | null;
  criticalAxes: number;
  advancedAxes: number;
  recommendationsOpen: number;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
  filtersDisabled?: boolean;
};

function DeltaBadge({ delta }: { delta: EvolutionDelta }) {
  if (delta.delta == null) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
        <Minus className="h-3 w-3" aria-hidden />
        Sem ciclo anterior
      </span>
    );
  }
  if (delta.trend === "up") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />+{delta.delta.toFixed(1)} p.p.
      </span>
    );
  }
  if (delta.trend === "down") {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-100">
        <ArrowDownRight className="h-3.5 w-3.5" aria-hidden />
        {delta.delta.toFixed(1)} p.p.
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/80">
      Estável ({delta.delta.toFixed(1)} p.p.)
    </span>
  );
}

function StatChip({
  icon: Icon,
  iconClass,
  children,
}: {
  icon: typeof Flame;
  iconClass: string;
  children: ReactNode;
}) {
  return (
    <li className="inline-flex items-center gap-1.5 text-xs text-slate-600">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${iconClass}`} aria-hidden />
      <span>{children}</span>
    </li>
  );
}

export function RespondentFamiMaturityHero({
  organizationName,
  forms,
  formId,
  onFormChange,
  availableYears,
  snapshotYear,
  onSnapshotYearChange,
  percentage,
  level,
  pointsObtained,
  pointsPossible,
  delta,
  lastProcessedAt,
  criticalAxes,
  advancedAxes,
  recommendationsOpen,
  loading,
  onRefresh,
  onExport,
  filtersDisabled,
}: Props) {
  const hasScore = percentage != null && level != null;
  const selectedForm = forms.find((f) => f.id === formId);

  return (
    <div className="space-y-6" aria-label="Pontuação FAMI">
      <section className="border-b border-slate-100 pb-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-4 sm:justify-start">
            <FamiMaturityIllustration />
            {hasScore && level != null && percentage != null ? (
              <FamiScoreRing percentage={percentage} level={level} />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div>
              <p className={typography.panelEyebrow}>Pontuação FAMI</p>
              <h2 className={typography.panelHeroTitle}>Maturidade institucional</h2>
              <p className={typography.panelHeroLead}>
                {organizationName || "Organização"}
                {selectedForm ? (
                  <>
                    {" "}
                    · {selectedForm.name} (v{selectedForm.version})
                  </>
                ) : null}
                {" — "}
                calculada automaticamente a partir das respostas, evidências e validações.
              </p>
            </div>

            {hasScore && level != null ? (
              <div className="flex flex-wrap items-center gap-2">
                <RespondentFamiLevelBadge level={level} size="md" />
                <DeltaBadge delta={delta} />
                {typeof pointsObtained === "number" && typeof pointsPossible === "number" ? (
                  <span className={typography.meta}>
                    {pointsObtained.toFixed(2)} / {pointsPossible.toFixed(2)} pontos elegíveis
                  </span>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Preencha o diagnóstico e aguarde o primeiro cálculo automático da maturidade.
              </p>
            )}

            <ul className="flex flex-wrap gap-x-4 gap-y-1">
              <StatChip icon={Flame} iconClass="text-rose-600">
                {criticalAxes} eixo{criticalAxes === 1 ? "" : "s"} crítico{criticalAxes === 1 ? "" : "s"}
              </StatChip>
              <StatChip icon={ShieldCheck} iconClass="text-emerald-600">
                {advancedAxes} eixo{advancedAxes === 1 ? "" : "s"} avançado{advancedAxes === 1 ? "" : "s"}
              </StatChip>
              <StatChip icon={ClipboardList} iconClass="text-slate-500">
                {recommendationsOpen} recomendaç{recommendationsOpen === 1 ? "ão" : "ões"} aberta
                {recommendationsOpen === 1 ? "" : "s"}
              </StatChip>
            </ul>

            <p className={typography.meta} role="status">
              Última atualização:{" "}
              <time className="font-medium text-slate-700" dateTime={lastProcessedAt ?? undefined}>
                {formatFamiUpdatedAt(lastProcessedAt)}
              </time>
            </p>
          </div>
        </div>
      </section>

      <PanelSection
        title="Filtros"
        description="Formulário, ano de referência e ações do diagnóstico."
        variant="plain"
      >
        <RespondentFamiFilters
          forms={forms}
          formId={formId}
          onFormChange={onFormChange}
          availableYears={availableYears}
          snapshotYear={snapshotYear}
          onSnapshotYearChange={onSnapshotYearChange}
          loading={loading}
          exportDisabled={!hasScore}
          filtersDisabled={filtersDisabled}
          onRefresh={onRefresh}
          onExport={onExport}
        />
      </PanelSection>
    </div>
  );
}
