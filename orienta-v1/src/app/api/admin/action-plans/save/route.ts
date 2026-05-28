import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    const body = await request.json();
    const service = new ActionPlansAdminService();
    const result = await service.save(body, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to save action plan", error, {
      route: "/api/admin/action-plans/save",
    });
    return handleActionPlansError(error);
  }
}
