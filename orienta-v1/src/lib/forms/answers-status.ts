import type { RespondentStatus } from "./answers-types";

/**
 * Deriva o status agregado de um respondente (orgao) sobre um formulario a
 * partir de tres sinais persistidos:
 *
 * - `answered` / `total`: contagem em `responses` versus `form_questions`.
 * - `hasSubmission`: existencia de qualquer linha em `fami_results` para o par
 *   (form, org). O reprocessamento FAMI roda no submit, entao a presenca
 *   indica que houve pelo menos uma submissao.
 * - `hasComplementationRequested`: existe alguma evidencia ligada a respostas
 *   deste par com a validacao mais recente igual a `complementation_requested`.
 *
 * A funcao e pura para facilitar teste e reuso na UI (badges, filtros).
 */
export function deriveRespondentStatus(input: {
  answered: number;
  total: number;
  hasSubmission: boolean;
  hasComplementationRequested: boolean;
}): RespondentStatus {
  const { answered, total, hasSubmission, hasComplementationRequested } = input;

  if (hasComplementationRequested) return "em_complementacao";
  if (answered <= 0) return "nao_iniciada";
  if (hasSubmission) return "submetida";
  if (total > 0 && answered >= total) return "completa";
  return "em_preenchimento";
}
