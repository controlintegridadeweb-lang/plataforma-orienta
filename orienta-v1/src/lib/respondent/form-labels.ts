/**
 * Rotulos de workflow do formulario para a UI do respondente (linguagem voltada
 * ao usuario final, ex. "Em preenchimento" em vez de "Rascunho").
 *
 * Para telas de admin/analista, use `getFormStateLabel` em
 * `@/lib/forms/form-state-labels` (rotulos mais tecnicos).
 */
export const FORM_STATE_LABEL_PT: Record<string, string> = {
  draft: "Em preenchimento",
  submitted: "Enviado",
  under_review: "Em analise",
  complementation_requested: "Complementacao solicitada",
  resubmitted: "Reenviado apos complementacao",
  consolidated: "Consolidado",
  closed: "Encerrado",
};

export function formStateLabelPt(state: string): string {
  return FORM_STATE_LABEL_PT[state] ?? state;
}
