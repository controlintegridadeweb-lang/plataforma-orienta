import { QuestionInput, RecommendationType } from "./types";

/**
 * Inferência canônica do tipo de recomendação a partir do estado da resposta
 * e da evidência. Note que `missing_evidence` (resposta "sim" + evidência
 * ainda não submetida / pendente de validação) NÃO é mais inferido — esse
 * cenário é tratado como pendência de evidência no fluxo de validação, não
 * como recomendação. Só quando a evidência é invalidada
 * surge `insufficient_evidence`.
 */
export function inferRecommendationType(
  question: QuestionInput,
): RecommendationType | null {
  if (question.isNotApplicable || !question.famiEnabled) {
    return null;
  }

  if (question.answer === "no") {
    return "not_implemented";
  }

  if (!question.requiresEvidence) {
    return null;
  }

  if (question.validationStatus === "invalidated") {
    return "insufficient_evidence";
  }

  return null;
}
