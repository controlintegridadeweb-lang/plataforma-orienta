import { getCurrentUser } from "@/lib/auth/current-user";
import { respondentProgress } from "@/lib/dashboards/queries";
import { defaultRespondentDashboardYear } from "@/lib/dashboards/respondent-dashboard-year";
import { RespondentFormulariosSection } from "@/components/respondente/respondent-formularios-section";
import { formSurface } from "@/lib/layout/form-surface";

export default async function RespondenteFormulariosPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return (
      <div className={formSurface.messageWarning}>
        Sua conta nao esta vinculada a uma organizacao. Entre em contato com o administrador.
      </div>
    );
  }

  const year = defaultRespondentDashboardYear();
  const forms = await respondentProgress(user.organizationId, { year });

  return <RespondentFormulariosSection initialForms={forms} initialYear={year} />;
}
