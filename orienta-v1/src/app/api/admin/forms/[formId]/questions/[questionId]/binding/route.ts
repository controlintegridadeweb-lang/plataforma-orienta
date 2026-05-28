import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { BindingService } from "@/lib/library/binding-service";
import { handleLibraryError } from "@/lib/library/http";
import { LibraryValidationError } from "@/lib/library/service";
import { logError } from "@/lib/observability/logger";

type RouteContext = {
  params: Promise<{ formId: string; questionId: string }>;
};

const idSchema = z.string().uuid();

function parseId(value: string, label: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: label, message: `${label} invalido.` },
    ]);
  }
  return parsed.data;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { questionId: rawQ } = await context.params;
    const questionId = parseId(rawQ, "questionId");
    const service = new BindingService();
    const binding = await service.getByQuestion(questionId);
    return NextResponse.json({ binding });
  } catch (error) {
    logError("Failed to read question binding", error, {
      route: "/api/admin/forms/:formId/questions/:questionId/binding",
    });
    return handleLibraryError(error);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    const { questionId: rawQ } = await context.params;
    const questionId = parseId(rawQ, "questionId");
    const body = await request.json();
    const service = new BindingService();
    const binding = await service.upsert(questionId, body, {
      userId: authContext?.userId ?? null,
    });
    return NextResponse.json({ binding });
  } catch (error) {
    logError("Failed to save question binding", error, {
      route: "/api/admin/forms/:formId/questions/:questionId/binding",
    });
    return handleLibraryError(error);
  }
}
