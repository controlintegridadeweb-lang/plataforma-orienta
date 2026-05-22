import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";

/**
 * GET portfolio via sessao; em dev, se `NEXT_PUBLIC_DEFAULT_ANALYST_USER_ID` estiver
 * definido, envia cabecalhos de desenvolvimento (mesmo mecanismo do workbench local).
 */
export function fetchRecommendationsPortfolio(formId: string, organizationId: string) {
  const params = new URLSearchParams({ formId, organizationId });
  const devId = getRuntimeDefaults().analystUserId?.trim();
  const useDevHeaders = process.env.NODE_ENV === "development" && Boolean(devId);
  return fetch(`/api/recommendations/portfolio?${params.toString()}`, {
    credentials: "include",
    headers: useDevHeaders ? buildDevAuthHeaders(devId!, "analyst") : undefined,
  });
}
