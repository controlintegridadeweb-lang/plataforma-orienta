import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { RespondentEvidencesService } from "@/lib/evidences/respondent-service";
import { handleEvidencesError } from "@/lib/evidences/http";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "respondent",
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
    };
    const service = new RespondentEvidencesService();
    const result = await service.statsForRespondent(raw, { organizationId });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to load respondent evidence stats", error, {
      route: "/api/respondent/evidences/stats",
    });
    return handleEvidencesError(error);
  }
}
