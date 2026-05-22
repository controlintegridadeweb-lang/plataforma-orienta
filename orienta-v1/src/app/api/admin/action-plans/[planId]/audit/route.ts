import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ planId: string }> };

export async function GET(request: Request, ctx: RouteContext) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  const { planId } = await ctx.params;
  try {
    const service = new ActionPlansAdminService();
    const entries = await service.listPlanAudit(planId, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    logError("Failed to list action plan audit", error, {
      route: "/api/admin/action-plans/[planId]/audit",
      planId,
    });
    return handleActionPlansError(error);
  }
}
