import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { FormsAdminService, FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([{ path: "formId", message: "formId invalido." }]);
  }
  return parsed.data;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const service = new FormsAdminService();
    const form = await service.getById(formId);
    return NextResponse.json({ form });
  } catch (error) {
    logError("Failed to load form", error, { route: "/api/admin/forms/:formId" });
    return handleFormsError(error);
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const payload = await request.json();
    const service = new FormsAdminService();
    // Uma unica rota aceita tres modos de edicao: rename (`{ name }`), archive
    // toggle (`{ archived }`) e prazo de resposta (`{ responseDeadlineAt }`).
    if (payload && typeof payload === "object") {
      if ("archived" in payload) {
        const form = await service.setArchived(formId, payload);
        return NextResponse.json({ form });
      }
      if ("responseDeadlineAt" in payload) {
        const form = await service.setDeadline(formId, payload);
        return NextResponse.json({ form });
      }
    }
    const form = await service.rename(formId, payload);
    return NextResponse.json({ form });
  } catch (error) {
    logError("Failed to patch form", error, { route: "/api/admin/forms/:formId" });
    return handleFormsError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const service = new FormsAdminService();
    await service.deleteForm(formId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Failed to delete form", error, { route: "/api/admin/forms/:formId" });
    return handleFormsError(error);
  }
}
