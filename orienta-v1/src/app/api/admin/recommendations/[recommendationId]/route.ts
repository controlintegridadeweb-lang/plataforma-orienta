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
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const { recommendationId: raw } = await context.params;
    const recommendationId = parseId(raw);

    const tenantError = await ensureRecommendationAccess(authContext!, recommendationId);
    if (tenantError) return tenantError;

    const service = new RecommendationsAdminService();
    const item = await service.get(recommendationId, {
      role: authContext!.role,
      organizationId: authContext!.organizationId,
    });
    return NextResponse.json({ item });
  } catch (error) {
    logError("Failed to get recommendation", error, {
      route: "/api/admin/recommendations/:id",
    });
    return handleRecommendationsError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const { recommendationId: raw } = await context.params;
    const recommendationId = parseId(raw);

    const tenantError = await ensureRecommendationAccess(authContext!, recommendationId);
    if (tenantError) return tenantError;

    const payload = await request.json();
    const service = new RecommendationsAdminService();
    const result = await service.update(
      recommendationId,
      payload,
      authContext!.userId,
      {
        role: authContext!.role,
        organizationId: authContext!.organizationId,
      },
    );
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to update recommendation", error, {
      route: "/api/admin/recommendations/:id",
    });
    return handleRecommendationsError(error);
  }
}
