import { QuestionInput, RecommendationType } from "./types";

export function inferRecommendationType(
  question: QuestionInput,
): RecommendationType | null {
  if (question.isNotApplicable || !question.famiEnabled) {
    return null;
  }

  if (question.answer === "no") {
    return "not_implemented";
  }

  if (question.answer === "partial") {
    return "partial_implementation";
  }

  if (!question.requiresEvidence) {
    return null;
  }

  if (
    question.validationStatus === "invalid" ||
    question.validationStatus === "partially_valid"
  ) {
    return "insufficient_evidence";
  }

  if (
    question.validationStatus === "pending" ||
    question.validationStatus === "complementation_requested" ||
    !question.validationStatus
  ) {
    return "missing_evidence";
  }

  return null;
}
