import { getCurrentUser } from "@/lib/auth/current-user";
import { RespondentFamiShell } from "@/components/respondente-fami/respondent-fami-shell";
import { layout } from "@/lib/layout/design-system";

export default async function RespondentePontuacaoFamiPage() {
  const user = await getCurrentUser();
  return (
    <div className={layout.pageStack}>
      <RespondentFamiShell defaultOrganizationId={user?.organizationId ?? null} />
    </div>
  );
}
