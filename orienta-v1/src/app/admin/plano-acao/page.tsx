import { AdminActionPlanShell } from "@/components/admin-plano-acao/admin-action-plan-shell";
import type { AdminPlanFiltersState } from "@/components/admin-plano-acao/admin-action-plan-filters";
import type { AdminPlanViewMode } from "@/components/admin-plano-acao/admin-action-plan-view-switcher";
import { firstSearchParam } from "@/lib/admin/search-params";

const VALID_VIEW_MODES: AdminPlanViewMode[] = ["status", "list", "organization"];

function isValidViewMode(value: string | undefined): value is AdminPlanViewMode {
  return value != null && VALID_VIEW_MODES.includes(value as AdminPlanViewMode);
}

export default async function AdminPlanoAcaoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view = firstSearchParam(sp, "view");
  const initialViewMode = isValidViewMode(view) ? view : undefined;
  const initialFilters: Partial<AdminPlanFiltersState> = {
    organizationId: firstSearchParam(sp, "organizationId") ?? "",
    formId: firstSearchParam(sp, "formId") ?? "",
  };

  return (
    <AdminActionPlanShell initialFilters={initialFilters} initialViewMode={initialViewMode} />
  );
}
