import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureRecommendationAccess } from "@/lib/api/tenant-guard";
import { RecommendationSuggestedActionsService } from "@/lib/recommendations/suggested-actions";
import { logError } from "@/lib/observability/logger";

type RouteParams = { params: Promise<{ recommendationId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { context, error: authError } = await requireAuth(_request, ["respondent"]);
  if (authError) return authError;

  const { recommendationId } = await params;
  const tenantError = await ensureRecommendationAccess(context!, recommendationId);
  if (tenantError) return tenantError;

  try {
    const service = new RecommendationSuggestedActionsService();
    const payload = await service.listForRecommendation(recommendationId);
    return NextResponse.json(payload);
  } catch (error) {
    logError("Failed to list suggested actions", error, {
      route: "/api/respondent/recommendations/[recommendationId]/suggested-actions",
      recommendationId,
    });
    const message =
      error instanceof Error ? error.message : "Falha ao carregar sugestoes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
