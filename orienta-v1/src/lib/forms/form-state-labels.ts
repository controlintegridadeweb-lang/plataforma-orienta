/**
 * Rotulos de estado de formulario para telas de admin/analista (UI em portugues).
 *
 * Para a UI do respondente, use `formStateLabelPt` em
 * `@/lib/respondent/form-labels` (rotulos mais voltados ao usuario final, ex.
 * "Em preenchimento" em vez de "Rascunho", "Em analise" em vez de "Em revisao").
 */
const FORM_STATE_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Submetido",
  under_review: "Em revisao",
  complementation_requested: "Complementacao",
  resubmitted: "Reenviado",
  consolidated: "Consolidado",
  closed: "Encerrado",
  published: "Publicado",
};

export function getFormStateLabel(state: string): string {
  return FORM_STATE_LABELS[state] ?? state;
}
