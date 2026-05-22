"use client";

import { CheckCircle2, FileCheck, FileQuestion, FileWarning, Hourglass } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RespondentStatsResult } from "@/lib/evidences/respondent-service";
import type { RespondentEvidenceStatus } from "@/lib/evidences/respondent-status";
import { MetricCard, MetricCardSkeleton, type MetricCardVariant } from "@/components/ui/metric-card";

type CardKey = "enviadas" | "aprovadas" | "aguardando" | "reprovadas" | "complementacao";

export type SummaryFilter = {
  status?: RespondentEvidenceStatus;
  pendingOnly?: boolean;
} | null;

type Props = {
  stats: RespondentStatsResult | null;
  loading?: boolean;
  /** Indica qual atalho esta ativo (highlight). */
  activeKey?: CardKey | null;
  onSelect: (key: CardKey, filter: SummaryFilter) => void;
};

type CardDef = {
  key: CardKey;
  label: string;
  description: string;
  icon: LucideIcon;
  variant: MetricCardVariant;
  value: (s: RespondentStatsResult) => number;
  filter: SummaryFilter;
};

const DEFS: CardDef[] = [
  {
    key: "enviadas",
    label: "Enviadas",
    description: "Total de evidências.",
    icon: FileCheck,
    variant: "neutral",
    value: (s) => s.enviadas,
    filter: null,
  },
  {
    key: "aprovadas",
    label: "Aprovadas",
    description: "Validadas pelo analista.",
    icon: CheckCircle2,
    variant: "success",
    value: (s) => s.aprovadas,
    filter: { status: "aprovada" },
  },
  {
    key: "aguardando",
    label: "Aguardando análise",
    description: "Inclui ajustadas e reenviadas.",
    icon: Hourglass,
    variant: "info",
    value: (s) => s.aguardando,
    filter: { status: "aguardando_analise" },
  },
  {
    key: "reprovadas",
    label: "Reprovadas",
    description: "Reenvie pelo formulário.",
    icon: FileWarning,
    variant: "danger",
    value: (s) => s.reprovadas,
    filter: { status: "reprovada" },
  },
  {
    key: "complementacao",
    label: "Complementação solicitada",
    description: "Você precisa responder.",
    icon: FileQuestion,
    variant: "warning",
    value: (s) => s.complementacao,
    filter: { status: "complementacao_solicitada" },
  },
];

export function RespondentEvidenceSummaryCards({
  stats,
  loading,
  activeKey,
  onSelect,
}: Props) {
  if (loading && !stats) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {DEFS.map((d) => (
          <MetricCardSkeleton key={d.key} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {DEFS.map((d) => {
        const Icon = d.icon;
        const isActive = activeKey === d.key;
        const v = stats ? d.value(stats) : 0;
        return (
          <MetricCard
            key={d.key}
            variant={d.variant}
            label={d.label}
            value={v}
            secondary={d.description}
            icon={Icon}
            density="compact"
            onClick={() => onSelect(d.key, d.filter)}
            aria-pressed={isActive}
            className={isActive ? "ring-2 ring-brand-300 border-brand-400/70" : ""}
          />
        );
      })}
    </div>
  );
}
