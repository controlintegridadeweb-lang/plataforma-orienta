import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { RecommendationsAdminService } from "@/lib/recommendations/admin-service";
import { handleRecommendationsError } from "@/lib/recommendations/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const url = new URL(request.url);
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
      axisId: url.searchParams.get("axisId") ?? undefined,
      recommendationId: url.searchParams.get("recommendationId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      type: url.searchParams.get("type") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    };
    const service = new RecommendationsAdminService();
    const result = await service.list(raw, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to list recommendations", error, {
      route: "/api/admin/recommendations",
    });
    return handleRecommendationsError(error);
  }
}
