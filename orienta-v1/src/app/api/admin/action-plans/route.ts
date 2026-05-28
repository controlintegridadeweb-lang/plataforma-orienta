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
      recommendationId: url.searchParams.get("recommendationId") ?? undefined,
      view: url.searchParams.get("view") ?? undefined,
      recommendationStatus: url.searchParams.get("recommendationStatus") ?? undefined,
      planStatus: url.searchParams.get("planStatus") ?? undefined,
      responsibleContains: url.searchParams.get("responsibleContains") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      dueFilter: url.searchParams.get("dueFilter") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    };
    const service = new ActionPlansAdminService();
    const result = await service.list(raw, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to list action plans", error, {
      route: "/api/admin/action-plans",
    });
    return handleActionPlansError(error);
  }
}
