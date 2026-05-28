import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { FormsAnswersService } from "@/lib/forms/answers-service";
import { FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([
      { path: "formId", message: "formId invalido." },
    ]);
  }
  return parsed.data;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { formId: raw } = await context.params;
    const formId = parseId(raw);
    const service = new FormsAnswersService();
    const summary = await service.getSummary(formId);
    return NextResponse.json({ summary });
  } catch (error) {
    logError("Failed to load answers summary", error, {
      route: "/api/admin/forms/:formId/answers/summary",
    });
    return handleFormsError(error);
  }
}
