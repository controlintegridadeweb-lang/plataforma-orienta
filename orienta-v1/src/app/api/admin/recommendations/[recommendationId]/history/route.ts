import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureRecommendationAccess } from "@/lib/api/tenant-guard";
import {
  RecommendationsAdminService,
  RecommendationsValidationError,
} from "@/lib/recommendations/admin-service";
import { handleRecommendationsError } from "@/lib/recommendations/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ recommendationId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new RecommendationsValidationError([
      { path: "recommendationId", message: "recommendationId invalido." },
    ]);
  }
  return parsed.data;
}

export async function GET(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    const { recommendationId: raw } = await context.params;
    const recommendationId = parseId(raw);

    const tenantError = await ensureRecommendationAccess(authContext!, recommendationId);
    if (tenantError) return tenantError;

    const service = new RecommendationsAdminService();
    const history = await service.listHistory(recommendationId, {
      role: authContext!.role,
      organizationId: authContext!.organizationId,
    });
    return NextResponse.json({ history });
  } catch (error) {
    logError("Failed to list recommendation history", error, {
      route: "/api/admin/recommendations/:id/history",
    });
    return handleRecommendationsError(error);
  }
}
