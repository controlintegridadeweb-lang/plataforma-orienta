import { getCurrentUser } from "@/lib/auth/current-user";
import { FamiMaturityShell } from "@/components/fami/fami-maturity-shell";
import { layout } from "@/lib/design-system";

export default async function AnalistaMaturidadePage() {
  const user = await getCurrentUser();

  return (
    <div className={layout.pageStack}>
      <FamiMaturityShell mode="analyst" defaultOrganizationId={user?.organizationId ?? null} />
    </div>
  );
}
