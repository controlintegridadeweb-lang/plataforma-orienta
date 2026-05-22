import {
  EvidencesShell,
  type EvidencesShellInitialFilters,
} from "@/components/evidencias/evidences-shell";
import { firstSearchParam } from "@/lib/admin/search-params";
import { layout } from "@/lib/design-system";

export default async function AdminEvidenciasPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const st = firstSearchParam(sp, "status");
  const initialFilters: EvidencesShellInitialFilters = {
    organizationId: firstSearchParam(sp, "organizationId") ?? "",
    formId: firstSearchParam(sp, "formId") ?? "",
    ...(st ? { status: st as EvidencesShellInitialFilters["status"] } : {}),
  };

  return (
    <div className={layout.pageStack}>
      <EvidencesShell initialFilters={initialFilters} variant="admin" />
    </div>
  );
}
