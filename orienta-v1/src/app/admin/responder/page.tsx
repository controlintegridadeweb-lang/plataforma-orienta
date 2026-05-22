import { getCurrentUser } from "@/lib/auth/current-user";
import { isGlobalAdmin } from "@/lib/auth/scope";
import {
  formsByOrganizationGlobal,
  formsByOrganizationScoped,
} from "@/lib/dashboards/queries";
import { AdminResponderSection } from "@/components/admin-responder/admin-responder-section";

export default async function AdminResponderPage() {
  const user = await getCurrentUser();
  const groups = user && isGlobalAdmin(user)
    ? await formsByOrganizationGlobal()
    : user?.organizationId
      ? await formsByOrganizationScoped(user.organizationId)
      : [];
  const groupsWithForms = groups.filter((g) => g.forms.length > 0);
  return <AdminResponderSection groupsWithForms={groupsWithForms} />;
}
