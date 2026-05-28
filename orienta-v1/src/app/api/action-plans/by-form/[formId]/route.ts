import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const uuid = z.string().uuid();

export async function GET(request: Request, ctx: RouteContext) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "respondent",
  ]);
  if (authError) return authError;

  const { formId } = await ctx.params;
  const parsedForm = uuid.safeParse(formId);
  if (!parsedForm.success) {
    return NextResponse.json({ error: "formId invalido." }, { status: 400 });
  }

  const url = new URL(request.url);
  let organizationId: string | undefined = url.searchParams.get("organizationId") ?? undefined;
  if (context!.role === "respondent") {
    organizationId = context!.organizationId ?? undefined;
  }

  const parsedOrg = organizationId ? uuid.safeParse(organizationId) : null;
  if (!parsedOrg?.success) {
    if (context!.role === "respondent") {
      return NextResponse.json(
        { error: "Usuario sem organizacao vinculada." },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "organizationId obrigatorio (UUID) para admin com escopo de organizacao." },
      { status: 400 },
    );
  }

  const tenantError = ensureOrganizationAccess(context!, parsedOrg.data);
  if (tenantError) return tenantError;

  try {
    const service = new ActionPlansAdminService();
    const data = await service.getByForm(parsedForm.data, parsedOrg.data, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    if (!data) {
      return NextResponse.json(
        { error: "Formulario ou organizacao nao encontrados." },
        { status: 404 },
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    logError("Failed to load action plan by form", error, {
      route: "/api/action-plans/by-form/[formId]",
      formId: parsedForm.data,
    });
    return handleActionPlansError(error);
  }
}
