import type { CurrentUser } from "@/lib/auth/current-user";
import { RecommendationsAdminService } from "@/lib/recommendations/admin-service";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";

/** Carrega opções de filtro no servidor (evita fetch duplicado no cliente). */
export async function loadRecommendationFilterOptions(
  user: CurrentUser,
): Promise<RecommendationFilterOptions> {
  const service = new RecommendationsAdminService();
  return service.listFilterOptions({
    role: user.role,
    organizationId: user.organizationId,
  });
}
