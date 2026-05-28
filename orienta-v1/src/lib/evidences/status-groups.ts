import type { LucideIcon } from "lucide-react";
import { EVIDENCE_VALIDATION_REGISTRY } from "@/lib/domain/status-registry";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import type { ValidationStatus } from "./schemas";

/** Grupo agregado para KPIs (4 visuais + total). */
export type EvidenceStatusKpiGroup =
  | "em_analise"
  | "aprovadas"
  | "rejeitadas"
  | "complementacao";

/** Classificacao fina por status do banco (6 valores) para badge / filtro. */
export type EvidenceVisualGroup = EvidenceStatusKpiGroup;

/**
 * Mapeia cada valor do enum DB para bucket visual (badge / filtro).
 * KPIs agregam: em_analise so pendentes; complementacao separada; etc.
 */
export function statusToVisualGroup(status: ValidationStatus): EvidenceVisualGroup {
  switch (status) {
    case "pending":
      return "em_analise";
    case "approved":
      return "aprovadas";
    case "invalidated":
      return "rejeitadas";
    case "adjustment_requested":
      return "complementacao";
    default:
      return "em_analise";
  }
}

/** Rotulos curtos em PT-BR para KPIs (cards). */
export const KPI_GROUP_LABEL: Record<EvidenceStatusKpiGroup, string> = {
  em_analise: "Em analise",
  aprovadas: "Aprovadas",
  rejeitadas: "Rejeitadas",
  complementacao: evidenceComplementation.statusShort,
};

/**
 * Contagem para painel: 4 cards alem do total.
 * "Em analise" no KPI inclui p pendente + pedido de complementacao (4 cards no header).
 */
export function aggregateKpiCounts(items: { currentStatus: ValidationStatus }[]): {
  total: number;
  em_analise: number;
  aprovadas: number;
  rejeitadas: number;
} {
  let em_analise = 0;
  let aprovadas = 0;
  let rejeitadas = 0;
  for (const { currentStatus } of items) {
    const g = statusToVisualGroup(currentStatus);
    if (g === "em_analise" || g === "complementacao") em_analise += 1;
    else if (g === "aprovadas") aprovadas += 1;
    else if (g === "rejeitadas") rejeitadas += 1;
  }
  return { total: items.length, em_analise, aprovadas, rejeitadas };
}

const VALIDATION_VARIANT: Record<
  ValidationStatus,
  "neutral" | "success" | "danger" | "warning" | "info" | "muted"
> = {
  pending: "neutral",
  approved: "success",
  invalidated: "danger",
  adjustment_requested: "info",
};

export const STATUS_BADGE_META: Record<
  ValidationStatus,
  {
    label: string;
    variant: "neutral" | "success" | "danger" | "warning" | "info" | "muted";
    icon: LucideIcon;
  }
> = Object.fromEntries(
  (Object.keys(EVIDENCE_VALIDATION_REGISTRY) as ValidationStatus[]).map((k) => {
    const e = EVIDENCE_VALIDATION_REGISTRY[k];
    return [
      k,
      {
        label: e.label,
        variant: VALIDATION_VARIANT[k],
        icon: e.icon!,
      },
    ];
  }),
) as Record<
  ValidationStatus,
  {
    label: string;
    variant: "neutral" | "success" | "danger" | "warning" | "info" | "muted";
    icon: LucideIcon;
  }
>;
