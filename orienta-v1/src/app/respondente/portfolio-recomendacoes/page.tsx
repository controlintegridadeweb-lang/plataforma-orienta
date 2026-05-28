import { getCurrentUser } from "@/lib/auth/current-user";
import { RespondentRecommendationsShell } from "@/components/respondente-recomendacoes/respondent-recommendations-shell";
import { formSurface } from "@/lib/layout/form-surface";
import { layout } from "@/lib/layout/design-system";

/**
 * Portfolio de Recomendacoes do Respondente.
 *
 * Server thin: garante que o usuario tem `organizationId` e delega para o
 * shell client-side. A listagem reusa `/api/respondent/action-plans?view=overview`,
 * que ja entrega `plan` (quando existe) por recomendacao.
 */
export default async function RespondentePortfolioRecomendacoesPage() {
  const user = await getCurrentUser();
  const organizationId = user?.organizationId ?? "";

  if (!organizationId) {
    return (
      <div className={formSurface.messageWarning}>
        Sua conta nao esta vinculada a uma organizacao. Entre em contato com o administrador.
      </div>
    );
  }

  return (
    <div className={layout.pageStack}>
      <RespondentRecommendationsShell />
    </div>
  );
}
