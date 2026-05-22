import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ExceptionsService } from "@/lib/library/exceptions-service";
import { handleLibraryError } from "@/lib/library/http";
import { LibraryValidationError } from "@/lib/library/service";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ id: string }> };

const idSchema = z.string().uuid();

function parseId(raw: string) {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: "id", message: "Identificador invalido." },
    ]);
  }
  return parsed.data;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  try {
    const { id: raw } = await context.params;
    const id = parseId(raw);
    const body = await request.json();
    const service = new ExceptionsService();
    const result = await service.decide(id, body, {
      userId: authContext?.userId ?? null,
    });
    return NextResponse.json({ exception: result });
  } catch (error) {
    logError("Failed to decide recommendation exception", error, {
      route: "/api/admin/library/exceptions/:id",
    });
    return handleLibraryError(error);
  }
}
