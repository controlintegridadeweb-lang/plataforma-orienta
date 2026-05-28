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
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const service = new FormsAdminService();
    const questions = await service.listQuestions(formId);
    return NextResponse.json({ questions });
  } catch (error) {
    logError("Failed to list form questions", error, {
      route: "/api/admin/forms/:formId/questions",
    });
    return handleFormsError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const payload = await request.json();
    const service = new FormsAdminService();
    const question = await service.createQuestion(formId, payload);
    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    logError("Failed to create question", error, {
      route: "/api/admin/forms/:formId/questions",
    });
    return handleFormsError(error);
  }
}
