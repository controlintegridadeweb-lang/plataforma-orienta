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

export async function PATCH(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const payload = await request.json();
    const service = new FormsAdminService();
    const questions = await service.reorderQuestions(formId, payload);
    return NextResponse.json({ questions });
  } catch (error) {
    logError("Failed to reorder questions", error, {
      route: "/api/admin/forms/:formId/questions/reorder",
    });
    return handleFormsError(error);
  }
}
