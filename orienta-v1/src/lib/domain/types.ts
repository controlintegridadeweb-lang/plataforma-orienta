export type ValidationStatus =
  | "pending"
  | "approved"
  | "invalidated"
  | "adjustment_requested";

export type AnswerValue = "yes" | "no" | "not_applicable";

export type WorkflowState =
  | "draft"
  | "submitted"
  | "under_review"
  | "complementation_requested"
  | "resubmitted"
  | "consolidated"
  | "closed";

export type RecommendationType =
  | "not_implemented"
  | "missing_evidence"
  | "insufficient_evidence";

export type QuestionInput = {
  id: string;
  axisId: string;
  sectionId: string;
  famiEnabled: boolean;
  requiresEvidence: boolean;
  answer: AnswerValue;
  validationStatus?: ValidationStatus;
  isNotApplicable?: boolean;
};
