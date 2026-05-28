import { StatusPill } from "@/components/ui/status-pill";
import { RESPONDENT_STATUS_LABEL, type RespondentStatus } from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/layout/form-surface";

const STATUS_TONE: Record<RespondentStatus, string> = {
  nao_iniciada: formSurface.badge.neutral,
  em_preenchimento: formSurface.badge.info,
  completa: formSurface.badge.brand,
  submetida: formSurface.badge.success,
  em_complementacao: formSurface.badge.warning,
};

export function AnswersStatusBadge({ status }: { status: RespondentStatus }) {
  return (
    <StatusPill
      className={STATUS_TONE[status]}
      aria-label={`Status: ${RESPONDENT_STATUS_LABEL[status]}`}
    >
      {RESPONDENT_STATUS_LABEL[status]}
    </StatusPill>
  );
}
