import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileQuestion,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type {
  EvidenceValidationEntry,
} from "./admin-service";
import type { ValidationStatus } from "./schemas";

/**
 * Status na visao do RESPONDENTE — vocabulario amigavel e focado em acao.
 *
 * Mapeia os 6 valores DB (`ValidationStatus`) + uma derivacao adicional
 * `ajustada_e_reenviada` (quando a evidencia atual esta pending mas o
 * historico tem uma `complementation_requested`, ou seja, o respondente
 * reagiu apos pedido do analista).
 */
export type RespondentEvidenceStatus =
  | "enviada"
  | "aguardando_analise"
  | "aprovada"
  | "reprovada"
  | "complementacao_solicitada"
  | "ajustada_e_reenviada";

export type RespondentStatusMeta = {
  label: string;
  description: string;
  variant: "neutral" | "info" | "success" | "danger" | "warning" | "muted";
  icon: LucideIcon;
};

export const RESPONDENT_STATUS_META: Record<
  RespondentEvidenceStatus,
  RespondentStatusMeta
> = {
  enviada: {
    label: "Enviada",
    description: "Sua evidência foi recebida pela plataforma.",
    variant: "neutral",
    icon: Clock,
  },
  aguardando_analise: {
    label: "Aguardando análise",
    description: "O analista ainda não revisou esta evidência.",
    variant: "info",
    icon: Clock,
  },
  aprovada: {
    label: "Aprovada",
    description: "Evidência considerada válida pelo analista.",
    variant: "success",
    icon: CheckCircle2,
  },
  reprovada: {
    label: "Reprovada",
    description:
      "Evidência rejeitada. Veja o motivo e reenvie pelo formulário.",
    variant: "danger",
    icon: XCircle,
  },
  complementacao_solicitada: {
    label: "Complementação solicitada",
    description:
      "O analista pediu ajustes — responda a complementação para reenviar.",
    variant: "warning",
    icon: FileQuestion,
  },
  ajustada_e_reenviada: {
    label: "Ajustada e reenviada",
    description:
      "Você respondeu uma complementação. Aguarde nova revisão do analista.",
    variant: "info",
    icon: RefreshCw,
  },
};

/** Sinaliza se um status do respondente representa pendência de ação dele. */
export function respondentStatusNeedsAction(
  status: RespondentEvidenceStatus,
): boolean {
  return status === "complementacao_solicitada" || status === "reprovada";
}

/**
 * Deriva o status do respondente a partir do status DB atual e do historico.
 * - `pending` puro                  -> aguardando_analise
 * - `pending` apos complementation  -> ajustada_e_reenviada
 * - `valid` / `waived`              -> aprovada
 * - `invalid` / `partially_valid`   -> reprovada
 * - `complementation_requested`     -> complementacao_solicitada
 */
export function deriveRespondentStatus(
  currentStatus: ValidationStatus,
  history: EvidenceValidationEntry[],
): RespondentEvidenceStatus {
  if (currentStatus === "valid" || currentStatus === "waived") return "aprovada";
  if (currentStatus === "invalid" || currentStatus === "partially_valid") {
    return "reprovada";
  }
  if (currentStatus === "complementation_requested") {
    return "complementacao_solicitada";
  }
  // currentStatus === "pending"
  const hadComplementation = history.some(
    (h) => h.status === "complementation_requested",
  );
  return hadComplementation ? "ajustada_e_reenviada" : "aguardando_analise";
}

/** Buckets agregados usados pelos KPIs do respondente. */
export type RespondentKpiKey =
  | "enviadas"
  | "aprovadas"
  | "aguardando"
  | "reprovadas"
  | "complementacao";

export const RESPONDENT_KPI_LABEL: Record<RespondentKpiKey, string> = {
  enviadas: "Enviadas",
  aprovadas: "Aprovadas",
  aguardando: "Aguardando análise",
  reprovadas: "Reprovadas",
  complementacao: "Complementação solicitada",
};

/** Mapa de status -> bucket KPI. */
export function statusToKpiBucket(
  status: RespondentEvidenceStatus,
): Exclude<RespondentKpiKey, "enviadas"> {
  switch (status) {
    case "aprovada":
      return "aprovadas";
    case "reprovada":
      return "reprovadas";
    case "complementacao_solicitada":
      return "complementacao";
    case "ajustada_e_reenviada":
    case "aguardando_analise":
    case "enviada":
    default:
      return "aguardando";
  }
}

/**
 * Indicador composto para o header (status geral do respondente).
 *
 * - has_action_required   -> precisa reenviar/complementar
 * - everything_under_review -> tudo aguardando
 * - all_approved           -> 100% aprovadas (e ha algo enviado)
 * - nothing_sent           -> sem evidencias
 */
export type RespondentOverallStatus =
  | "nothing_sent"
  | "all_approved"
  | "has_action_required"
  | "everything_under_review"
  | "mixed";

export function overallStatus(counts: {
  enviadas: number;
  aprovadas: number;
  aguardando: number;
  reprovadas: number;
  complementacao: number;
}): RespondentOverallStatus {
  if (counts.enviadas === 0) return "nothing_sent";
  if (counts.complementacao > 0 || counts.reprovadas > 0) {
    return "has_action_required";
  }
  if (counts.aprovadas === counts.enviadas) return "all_approved";
  if (counts.aguardando === counts.enviadas) return "everything_under_review";
  return "mixed";
}
