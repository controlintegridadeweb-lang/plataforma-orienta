import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureRecommendationAccess } from "@/lib/api/tenant-guard";
import { RecommendationSuggestedActionsService } from "@/lib/recommendations/suggested-actions";
import { logError } from "@/lib/observability/logger";

const bodySchema = z.object({
  indices: z.array(z.number().int().min(0).max(50)).min(1).max(20),
});

type RouteParams = { params: Promise<{ recommendationId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  if (!context?.organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  const { recommendationId } = await params;
  const tenantError = await ensureRecommendationAccess(context!, recommendationId);
  if (tenantError) return tenantError;

  const body = await request.json().catch(() => ({}));
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new RecommendationSuggestedActionsService();
    const result = await service.applyIndices(recommendationId, parsed.data.indices, {
      role: "respondent",
      organizationId: context.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to apply suggested actions", error, {
      route: "/api/respondent/recommendations/[recommendationId]/apply-suggestions",
      recommendationId,
    });
    const message =
      error instanceof Error ? error.message : "Falha ao adicionar sugestoes ao plano.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
