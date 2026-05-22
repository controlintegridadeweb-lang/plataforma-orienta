import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { EvidencesAdminService } from "@/lib/evidences/admin-service";
import { handleEvidencesError } from "@/lib/evidences/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const url = new URL(request.url);
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      ids: url.searchParams.get("ids") ?? undefined,
    };
    const service = new EvidencesAdminService();
    const result = await service.getStats(raw, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to load evidence stats", error, {
      route: "/api/admin/evidences/stats",
    });
    return handleEvidencesError(error);
  }
}
