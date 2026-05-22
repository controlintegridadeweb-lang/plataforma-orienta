import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureRecommendationAccess } from "@/lib/api/tenant-guard";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const recommendationId = url.searchParams.get("recommendationId") ?? undefined;
    const tenantError = recommendationId
      ? await ensureRecommendationAccess(context!, recommendationId)
      : null;
    if (tenantError) return tenantError;

    const service = new ActionPlansAdminService();
    const notes = await service.listSupervisionNotes(
      { recommendationId },
      { role: context!.role, organizationId: context!.organizationId },
    );
    return NextResponse.json({ notes });
  } catch (error) {
    logError("Failed to list supervision notes", error, {
      route: "/api/admin/action-plans/supervision-notes",
    });
    return handleActionPlansError(error);
  }
}

export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const body = await request.json();
    const recommendationId =
      typeof body?.recommendationId === "string" ? body.recommendationId : undefined;
    const tenantError = recommendationId
      ? await ensureRecommendationAccess(context!, recommendationId)
      : null;
    if (tenantError) return tenantError;

    const service = new ActionPlansAdminService();
    const note = await service.createSupervisionNote(body, {
      role: context!.role,
      organizationId: context!.organizationId,
    }, context!.userId);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    logError("Failed to create supervision note", error, {
      route: "/api/admin/action-plans/supervision-notes",
    });
    return handleActionPlansError(error);
  }
}
