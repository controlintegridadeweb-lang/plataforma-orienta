import { notify } from "@/lib/notify";
import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";

export type FamiReprocessToastPayload = {
  recommendationsCreated?: number;
  recommendationsUpdated?: number;
} | null | undefined;

const DEBOUNCE_MS = 3000;
let lastToastAt = 0;

export function portfolioPendingLink(formId: string): string {
  const params = new URLSearchParams({ view: "awaiting_action", formId });
  return `${RESPONDENT_PORTFOLIO_LIST_PATH}?${params.toString()}`;
}

/**
 * Feedback discreto após reprocessamento incremental (salvar resposta no wizard).
 */
export function notifyRespondentReprocessOutcome(
  formId: string,
  fami: FamiReprocessToastPayload,
  context?: { answer?: "yes" | "no" | "not_applicable"; requiresEvidence?: boolean },
): void {
  const now = Date.now();
  if (now - lastToastAt < DEBOUNCE_MS) return;
  lastToastAt = now;

  const created = fami?.recommendationsCreated ?? 0;
  const updated = fami?.recommendationsUpdated ?? 0;

  if (created > 0) {
    notify.success(
      created === 1
        ? "Nova recomendação gerada."
        : `${created} novas recomendações geradas.`,
      {
        description: "Em Recomendações e plano, use «Cadastrar ações» em cada item pendente.",
        duration: 5000,
      },
    );
    return;
  }

  if (updated > 0) {
    notify.info(
      updated === 1
        ? "Recomendação atualizada conforme sua resposta."
        : `${updated} recomendações atualizadas.`,
      { duration: 4000 },
    );
    return;
  }

  if (context?.answer === "yes" && context.requiresEvidence) {
    notify.info("Resposta salva. Evidência em análise.", { duration: 3500 });
  }
}

export function formatSubmitRecommendationMessage(created: number): string {
  if (created === 0) {
    return "Envio finalizado. Nenhuma recomendação foi disparada pelas respostas atuais.";
  }
  if (created === 1) return "Envio finalizado. Foi gerada 1 recomendação.";
  return `Envio finalizado. Foram geradas ${created} recomendações.`;
}
