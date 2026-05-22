import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { RespondentEvidencesService } from "@/lib/evidences/respondent-service";
import { handleEvidencesError } from "@/lib/evidences/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "respondent",
    "analyst",
    "admin",
  ]);
  if (authError) return authError;
  const organizationId = context!.organizationId;
  if (!organizationId) {
    return NextResponse.json(
      { error: "Sua conta nao esta vinculada a uma organizacao." },
      { status: 400 },
    );
  }
  try {
    const url = new URL(request.url);
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      pendingOnly: url.searchParams.get("pendingOnly") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      offset: url.searchParams.get("offset") ?? undefined,
    };
    const service = new RespondentEvidencesService();
    const result = await service.listForRespondent(raw, { organizationId });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to list respondent evidences", error, {
      route: "/api/respondent/evidences",
    });
    return handleEvidencesError(error);
  }
}
