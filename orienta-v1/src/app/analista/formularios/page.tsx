import { formsByOrganizationGlobal } from "@/lib/dashboards/queries";
import { AnalistaFormulariosSection } from "@/components/analista-formularios/analista-formularios-section";

export default async function AnalistaFormulariosPage() {
  const groups = await formsByOrganizationGlobal();
  const groupsWithForms = groups.filter((g) => g.forms.length > 0);

  return <AnalistaFormulariosSection groupsWithForms={groupsWithForms} />;
}
