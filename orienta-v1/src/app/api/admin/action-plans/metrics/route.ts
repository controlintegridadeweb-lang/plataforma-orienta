import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    const url = new URL(request.url);
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
    };
    const service = new ActionPlansAdminService();
    const result = await service.metrics(raw, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to load action plan metrics", error, {
      route: "/api/admin/action-plans/metrics",
    });
    return handleActionPlansError(error);
  }
}
