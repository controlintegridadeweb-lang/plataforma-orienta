import { WorkflowState } from "./types";

const transitions: Record<WorkflowState, WorkflowState[]> = {
  draft: ["submitted"],
  submitted: ["under_review", "draft"],
  under_review: ["complementation_requested", "consolidated"],
  complementation_requested: ["resubmitted"],
  resubmitted: ["under_review"],
  consolidated: ["closed"],
  closed: ["draft"],
};

/** Transições intermediárias expostas na UI (publicar/aprovar/encerrar têm rotas dedicadas). */
export const INTERMEDIATE_TRANSITION_LABELS: Partial<
  Record<`${WorkflowState}->${WorkflowState}`, string>
> = {
  "submitted->under_review": "Iniciar revisão",
  "submitted->draft": "Voltar para rascunho",
  "under_review->complementation_requested": formCycleComplementation.actionRequest,
  "complementation_requested->resubmitted": formCycleComplementation.actionMarkResubmitted,
  "resubmitted->under_review": "Retomar revisão",
};

import {
  evidenceComplementation,
  formCycleComplementation,
} from "@/lib/labels/complementation-terms";

export function allowedTransitions(from: WorkflowState): WorkflowState[] {
  return transitions[from];
}

export function canTransition(from: WorkflowState, to: WorkflowState): boolean {
  return transitions[from].includes(to);
}

export function isIntermediateTransition(from: WorkflowState, to: WorkflowState): boolean {
  const key = `${from}->${to}` as `${WorkflowState}->${WorkflowState}`;
  return key in INTERMEDIATE_TRANSITION_LABELS;
}
