import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { FormsAnswersService } from "@/lib/forms/answers-service";
import { FormsValidationError } from "@/lib/forms/admin-service";
import { handleFormsError } from "@/lib/forms/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = {
  params: Promise<{ formId: string; organizationId: string }>;
};

const idSchema = z.string().uuid();

function parseId(value: string, path: string): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new FormsValidationError([
      { path, message: `${path} invalido.` },
    ]);
  }
  return parsed.data;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { formId: rawForm, organizationId: rawOrg } = await context.params;
    const formId = parseId(rawForm, "formId");
    const organizationId = parseId(rawOrg, "organizationId");

    const service = new FormsAnswersService();
    const detail = await service.getRespondentDetail(formId, organizationId);
    return NextResponse.json({ detail });
  } catch (error) {
    logError("Failed to load respondent detail", error, {
      route: "/api/admin/forms/:formId/answers/respondents/:organizationId",
    });
    return handleFormsError(error);
  }
}
