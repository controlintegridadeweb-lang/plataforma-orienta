import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { LibraryService } from "@/lib/library/service";
import { LibraryRepository } from "@/lib/library/repository";
import { handleLibraryError, parseCatalogEntityParam } from "@/lib/library/http";
import { logError } from "@/lib/observability/logger";
import type { LibraryCatalogEntity } from "@/lib/library/types";

type RouteContext = { params: Promise<{ entity: string }> };

async function listByEntity(entity: LibraryCatalogEntity) {
  const repo = new LibraryRepository();
  switch (entity) {
    case "axes":
      return repo.listAxes();
    case "sections":
      return repo.listSections();
    case "recommendations":
      return repo.listRecommendations();
    case "actions":
      return repo.listActions();
  }
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const { entity: raw } = await context.params;
    const entity = parseCatalogEntityParam(raw);
    const items = await listByEntity(entity);
    return NextResponse.json({ items });
  } catch (error) {
    logError("Failed to list library items", error, { route: "/api/admin/library" });
    return handleLibraryError(error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;

  try {
    const { entity: raw } = await context.params;
    const entity = parseCatalogEntityParam(raw);
    const payload = await request.json();
    const service = new LibraryService();
    const item = await service.create(entity, payload, {
      userId: authContext?.userId ?? null,
    });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    logError("Failed to create library item", error, { route: "/api/admin/library" });
    return handleLibraryError(error);
  }
}
