import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { RecommendationsAdminService } from "@/lib/recommendations/admin-service";
import { handleRecommendationsError } from "@/lib/recommendations/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
    "respondent",
  ]);
  if (authError) return authError;
  try {
    const service = new RecommendationsAdminService();
    const filters = await service.listFilterOptions({
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(filters);
  } catch (error) {
    logError("Failed to list recommendation filters", error, {
      route: "/api/admin/recommendations/filters",
    });
    return handleRecommendationsError(error);
  }
}
