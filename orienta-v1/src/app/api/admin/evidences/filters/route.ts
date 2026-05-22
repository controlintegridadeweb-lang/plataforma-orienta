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
    const service = new EvidencesAdminService();
    const filters = await service.listFilterOptions({
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(filters);
  } catch (error) {
    logError("Failed to list evidence filters", error, {
      route: "/api/admin/evidences/filters",
    });
    return handleEvidencesError(error);
  }
}
