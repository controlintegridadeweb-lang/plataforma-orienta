import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { RecommendationsAdminService } from "@/lib/recommendations/admin-service";
import { handleRecommendationsError } from "@/lib/recommendations/http";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const payload = await request.json();
    const service = new RecommendationsAdminService();
    const result = await service.regenerateForForm(payload, {
      role: authContext!.role,
      organizationId: authContext!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to regenerate recommendations", error, {
      route: "/api/admin/recommendations/regenerate",
    });
    return handleRecommendationsError(error);
  }
}
