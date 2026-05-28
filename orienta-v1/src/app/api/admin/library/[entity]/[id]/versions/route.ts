import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  LibraryService,
  LibraryValidationError,
} from "@/lib/library/service";
import { handleLibraryError, parseCatalogEntityParam } from "@/lib/library/http";
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

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  try {
    const { entity: rawEntity, id: rawId } = await context.params;
    const entity = parseCatalogEntityParam(rawEntity);
    const id = parseIdParam(rawId);
    const service = new LibraryService();
    const versions = await service.listVersions(entity, id);
    return NextResponse.json({ versions });
  } catch (error) {
    logError("Failed to list library item versions", error, {
      route: "/api/admin/library/:entity/:id/versions",
    });
    return handleLibraryError(error);
  }
}
