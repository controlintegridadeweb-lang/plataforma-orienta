import { getCurrentUser } from "@/lib/auth/current-user";
import { RespondentActionPlanShell } from "@/components/respondente-plano-acao/respondent-action-plan-shell";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";

/**
 * Plano de Acao do Respondente.
 *
 * Server thin: valida `organizationId` e delega para o shell client-side.
 * Toda a lista vem de `/api/respondent/action-plans?view=overview`,
 * que entrega recomendacao + plano (quando existir).
 */
export default async function RespondentePlanoAcaoPage() {
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
      <RespondentActionPlanShell />
    </div>
  );
}
