import { getCurrentUser } from "@/lib/auth/current-user";
import { firstSearchParam } from "@/lib/admin/search-params";
import { respondentProgress } from "@/lib/dashboards/queries";
import { RespondentEvidencesShell } from "@/components/respondente-evidencias/respondent-evidences-shell";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";

/**
 * Rota canônica de evidências. Sem `view=all`, abre com filtro de complementação;
 * com `?view=all`, lista todas as evidências.
 */
export default async function RespondenteEvidenciasComplementacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const viewAll = firstSearchParam(sp, "view") === "all";
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return (
      <div className={formSurface.messageWarning}>
        Sua conta não está vinculada a uma organização. Entre em contato com o administrador.
      </div>
    );
  }

  const forms = await respondentProgress(user.organizationId);
  const formOptions = forms.map((f) => ({ id: f.formId, name: f.formName }));

  return (
    <div className={layout.pageStack}>
      <RespondentEvidencesShell
        formOptions={formOptions}
        initial={viewAll ? undefined : { status: "complementacao_solicitada" }}
      />
    </div>
  );
}
