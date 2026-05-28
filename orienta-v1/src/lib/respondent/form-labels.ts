/**
 * Rotulos de workflow do formulario para a UI do respondente (linguagem voltada
 * ao usuario final, ex. "Em preenchimento" em vez de "Rascunho").
 *
 * Para telas de admin, use rotulos tecnicos alinhados ao workflow
 * (`draft` → "Rascunho", `under_review` → "Em revisao", etc.) no proprio componente.
 */
export const FORM_STATE_LABEL_PT: Record<string, string> = {
  draft: "Em preenchimento",
  submitted: "Enviado",
  under_review: "Em analise",
  complementation_requested: "Aguardando ajuste",
  resubmitted: "Reenviado após ajuste do ciclo",
  consolidated: "Consolidado",
  closed: "Encerrado",
};

export function formStateLabelPt(state: string): string {
  return FORM_STATE_LABEL_PT[state] ?? state;
}
