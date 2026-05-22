import { redirect } from "next/navigation";
import { AdminRecommendationsShell } from "@/components/admin-recomendacoes/admin-recommendations-shell";
import { firstSearchParam } from "@/lib/admin/search-params";
import type { AdminFiltersState } from "@/components/admin-recomendacoes/admin-recommendation-filters";

export default async function AnalistaRecomendacoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const recommendationId = firstSearchParam(sp, "recommendationId") ?? "";
  if (recommendationId.trim()) {
    redirect(`/analista/recomendacoes/${recommendationId.trim()}/visao-geral`);
  }

  const initialFilters: Partial<AdminFiltersState> = {
    organizationId: firstSearchParam(sp, "organizationId") ?? "",
    formId: firstSearchParam(sp, "formId") ?? "",
    axisId: firstSearchParam(sp, "axisId") ?? "",
  };

  return <AdminRecommendationsShell initialFilters={initialFilters} />;
}
