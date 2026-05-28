import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { FormsAdminService, FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string; questionId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string, label: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([
      { path: label, message: `${label} invalido.` },
    ]);
  }
  return parsed.data;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: rawForm, questionId: rawQ } = await context.params;
    const formId = parseId(rawForm, "formId");
    const questionId = parseId(rawQ, "questionId");
    const payload = await request.json();
    const service = new FormsAdminService();
    const question = await service.updateQuestion(formId, questionId, payload);
    return NextResponse.json({ question });
  } catch (error) {
    logError("Failed to update question", error, {
      route: "/api/admin/forms/:formId/questions/:questionId",
    });
    return handleFormsError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: rawForm, questionId: rawQ } = await context.params;
    const formId = parseId(rawForm, "formId");
    const questionId = parseId(rawQ, "questionId");
    const service = new FormsAdminService();
    await service.removeQuestion(formId, questionId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Failed to delete question", error, {
      route: "/api/admin/forms/:formId/questions/:questionId",
    });
    return handleFormsError(error);
  }
}
