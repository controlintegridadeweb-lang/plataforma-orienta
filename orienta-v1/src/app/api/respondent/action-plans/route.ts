import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { listActionPlansQuerySchema } from "@/lib/action-plans/schemas";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  if (!context?.organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
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
    const query = listActionPlansQuerySchema.parse(raw);
    const result = await service.list(query, {
      role: "respondent",
      organizationId: context.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to list respondent action plans", error, {
      route: "/api/respondent/action-plans",
    });
    return handleActionPlansError(error);
  }
}

export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  if (!context?.organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const service = new ActionPlansAdminService();
    const result = await service.save(body, {
      role: "respondent",
      organizationId: context.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to save respondent action plan", error, {
      route: "/api/respondent/action-plans",
    });
    return handleActionPlansError(error);
  }
}
