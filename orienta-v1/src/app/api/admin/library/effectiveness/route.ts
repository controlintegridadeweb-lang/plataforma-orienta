import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { EffectivenessService } from "@/lib/library/effectiveness-service";
import { handleLibraryError } from "@/lib/library/http";
import { logError } from "@/lib/observability/logger";
import type { LibraryItemType } from "@/lib/library/types";

const VALID_TYPES: LibraryItemType[] = [
  "axis",
  "section",
  "metric",
  "recommendation",
  "action",
];

export async function GET(request: Request) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  try {
    const url = new URL(request.url);
    const itemType = url.searchParams.get("itemType") as LibraryItemType | null;
    const periodStart = url.searchParams.get("periodStart") ?? undefined;
    const periodEnd = url.searchParams.get("periodEnd") ?? undefined;
    const service = new EffectivenessService();
    const rows = await service.list({
      itemType:
        itemType && VALID_TYPES.includes(itemType) ? itemType : undefined,
      periodStart,
      periodEnd,
    });
    return NextResponse.json({ rows });
  } catch (error) {
    logError("Failed to list library effectiveness", error, {
      route: "/api/admin/library/effectiveness",
    });
    return handleLibraryError(error);
  }
}
