/**
 * Vocabulário distinto: complementação do ciclo do formulário (WorkflowState)
 * vs complementação de evidência (evidence_validations.status).
 */

/** Ciclo institucional do formulário — estado `complementation_requested` em `forms.state`. */
export const formCycleComplementation = {
  stateLabel: "Aguardando ajuste",
  stateShort: "Ciclo: ajuste",
  stateDescription:
    "A administração solicitou ajustes institucionais no ciclo deste formulário.",
  resubmittedDescription: "Organizações reenviaram após complementação do ciclo institucional.",
  actionRequest: "Solicitar ajuste do ciclo",
  actionMarkResubmitted: "Marcar ciclo como reenviado",
  configHint:
    "Ciclo do formulário — não é o mesmo que pedir complementação de uma evidência na fila de validação.",
} as const;

/** Validação por pergunta — status `complementation_requested` em `evidence_validations`. */
export const evidenceComplementation = {
  statusLabel: "Ajuste de evidência",
  statusShort: "Evidência: ajuste",
  statusDescription:
    "A equipe pediu ajustes ou documentos adicionais nesta evidência (pergunta específica).",
  respondentStatusLabel: "Complementação de evidência solicitada",
  respondentStatusDescription:
    "A equipe pediu ajustes nesta evidência — responda pelo formulário e reenvie o anexo ou link.",
  actionRequest: "Solicitar complementação de evidência",
  respondCta: "Responder complementação de evidência",
  sectionTitle: "Complementação de evidência pendente",
  sectionDescription:
    "Pedidos de ajuste em evidências enviadas (validação por pergunta), não confundir com o ciclo do formulário.",
  navDescription:
    "Validação de evidências e pedidos de complementação por pergunta respondida.",
  kpiLabel: "Complementações de evidência",
  kpiHintPending: "Pedidos de ajuste na validação de evidências — clique para responder",
  kpiHintEmpty: "Acompanhe validações e complementações de evidência",
  answersOrgStatus: "Em complementação de evidência",
  panelHint:
    "Complementação de evidência — ajuste anexos ou links na pergunta indicada; distinto do ciclo institucional do formulário.",
} as const;
