import { getCurrentUser } from "@/lib/auth/current-user";
import { respondentProgress } from "@/lib/dashboards/queries";
import { computeRespondentDashboardSummary } from "@/lib/dashboards/respondent-dashboard-summary";
import { defaultRespondentDashboardYear } from "@/lib/dashboards/respondent-dashboard-year";
import { RespondentDashboardSection } from "@/components/dashboard/respondent-dashboard-section";

export default async function RespondenteDashboardPage() {
  const user = await getCurrentUser();
  const organizationId = user?.organizationId ?? "";
  const year = defaultRespondentDashboardYear();

  const forms = organizationId
    ? await respondentProgress(organizationId, { year })
    : [];
  const summary = computeRespondentDashboardSummary(forms);

  return (
    <RespondentDashboardSection
      initialForms={forms}
      initialYear={year}
      initialSummary={summary}
    />
  );
}
