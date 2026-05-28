import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { LibraryService } from "@/lib/library/service";
import { handleLibraryError } from "@/lib/library/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  try {
    const service = new LibraryService();
    const catalog = await service.snapshotCatalog();
    return NextResponse.json(catalog);
  } catch (error) {
    logError("Failed to load library catalog snapshot", error, {
      route: "/api/admin/library/catalog",
    });
    return handleLibraryError(error);
  }
}
