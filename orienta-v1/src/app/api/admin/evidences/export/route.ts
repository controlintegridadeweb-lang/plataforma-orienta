import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { EvidencesAdminService } from "@/lib/evidences/admin-service";
import { buildEvidencesCsv, buildEvidencesPdf } from "@/lib/evidences/export";
import { handleEvidencesError } from "@/lib/evidences/http";
import { evidenceExportFormatSchema } from "@/lib/evidences/schemas";
import { aggregateKpiCounts } from "@/lib/evidences/status-groups";
import { logError } from "@/lib/observability/logger";

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;
  try {
    const url = new URL(request.url);
    const formatRaw = url.searchParams.get("format");
    const fmtParsed = evidenceExportFormatSchema.safeParse(formatRaw);
    if (!fmtParsed.success) {
      return NextResponse.json(
        { error: "Informe format=csv ou format=pdf." },
        { status: 400 },
      );
    }
    const format = fmtParsed.data;
    const raw = {
      formId: url.searchParams.get("formId") ?? undefined,
      organizationId: url.searchParams.get("organizationId") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
      search: url.searchParams.get("search") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      ids: url.searchParams.get("ids") ?? undefined,
    };
    const service = new EvidencesAdminService();
    const items = await service.listForExport(raw, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    const stats = aggregateKpiCounts(items);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");

    if (format === "csv") {
      const body = buildEvidencesCsv(items);
      return new NextResponse(body, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="evidencias-${stamp}.csv"`,
        },
      });
    }

    const bytes = await buildEvidencesPdf({
      items,
      stats,
      generatedAtIso: new Date().toISOString(),
    });
    return new NextResponse(Buffer.from(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="evidencias-${stamp}.pdf"`,
      },
    });
  } catch (error) {
    logError("Failed to export evidences", error, {
      route: "/api/admin/evidences/export",
    });
    return handleEvidencesError(error);
  }
}
