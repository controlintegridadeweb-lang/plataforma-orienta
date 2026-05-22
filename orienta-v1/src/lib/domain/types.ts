export type ValidationStatus =
  | "pending"
  | "valid"
  | "invalid"
  | "partially_valid"
  | "complementation_requested"
  | "waived";

export type AnswerValue = "yes" | "no" | "partial";

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
  | "partial_implementation"
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
