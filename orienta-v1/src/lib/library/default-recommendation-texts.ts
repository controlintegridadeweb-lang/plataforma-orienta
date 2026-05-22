import type { LibraryScenarioKey } from "./binding-types";

/**
 * Textos oficiais sugeridos para o campo principal do vínculo (`recommendation.title`).
 * O motor de recomendação usa `title` como base visível; `textoBaseFixo` é complemento opcional.
 */
export const OFFICIAL_RECOMMENDATION_TITLE_BY_SCENARIO: Partial<
  Record<LibraryScenarioKey, string>
> = {
  sim_sem_evidencia:
    "Anexe evidência documental que comprove o atendimento a este requisito. Sem o comprovante adequado, o item permanece em situação de risco de conformidade.",
  sim_evidencia_invalida:
    "A evidência enviada não comprova de forma válida o atendimento. Envie nova documentação ou ajuste o material conforme os critérios de validação definidos para esta pergunta.",
};
