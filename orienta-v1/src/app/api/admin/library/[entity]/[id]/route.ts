import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { LibraryService } from "@/lib/library/service";
import { handleLibraryError, parseCatalogEntityParam } from "@/lib/library/http";
import { LibraryValidationError } from "@/lib/library/service";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ entity: string; id: string }> };

const idSchema = z.string().uuid();

function parseIdParam(value: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: "id", message: "Identificador invalido." },
    ]);
  }
  return parsed.data;
}

export async function PUT(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const { entity: rawEntity, id: rawId } = await context.params;
    const entity = parseCatalogEntityParam(rawEntity);
    const id = parseIdParam(rawId);
    const payload = await request.json();
    const service = new LibraryService();
    const item = await service.update(entity, id, payload, {
      userId: authContext?.userId ?? null,
    });
    return NextResponse.json({ item });
  } catch (error) {
    logError("Failed to update library item", error, { route: "/api/admin/library/:id" });
    return handleLibraryError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  // Exclusao definitiva permanece admin-only conforme matriz de permissoes.
  const { context: authContext, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  try {
    const { entity: rawEntity, id: rawId } = await context.params;
    const entity = parseCatalogEntityParam(rawEntity);
    const id = parseIdParam(rawId);
    const service = new LibraryService();
    await service.remove(entity, id, { userId: authContext?.userId ?? null });
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Failed to delete library item", error, { route: "/api/admin/library/:id" });
    return handleLibraryError(error);
  }
}
