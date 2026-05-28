import { NextResponse } from "next/server";
import { z } from "zod";
import { buildOfficialReportPdf } from "@/lib/report/pdf";
import { loadOfficialReportData } from "@/lib/report/build-official-report-data";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logError } from "@/lib/observability/logger";

const bodySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
  processingVersion: z.number().int().positive().optional(),
});

/**
 * Gera PDF oficial a partir de fami_results / contagens no banco (nao aceita numeros arbitrarios do cliente).
 */
export async function POST(request: Request) {
  const { context, error } = await requireAuth(request, ["admin", "respondent"]);
  if (error) return error;

  let parsedBody: z.infer<typeof bodySchema>;
  try {
    const body = await request.json();
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    parsedBody = parsed.data;
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const tenantError = ensureOrganizationAccess(context!, parsedBody.organizationId);
  if (tenantError) return tenantError;

  try {
    const data = await loadOfficialReportData(parsedBody);
    if (!data) {
      return NextResponse.json(
        {
          error:
            "Nenhum processamento FAMI global encontrado para este par organizacao/formulario. Execute Reprocessar FAMI antes.",
        },
        { status: 404 },
      );
    }

    const supabase = createSupabaseServiceRoleClient();
    await supabase.from("reports").insert({
      form_id: parsedBody.formId,
      organization_id: parsedBody.organizationId,
      processing_version: data.processingVersion,
      generated_by: context!.userId,
      file_path: `official:${parsedBody.formId}:${parsedBody.organizationId}:${data.processingVersion}`,
      generated_at: data.generatedAtIso,
    });

    const pdfBytes = await buildOfficialReportPdf(data);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="relatorio-orienta-v1.pdf"',
      },
    });
  } catch (error) {
    logError("Failed to build report PDF", error, { route: "/api/reports/official" });
    return NextResponse.json({ error: "Falha ao gerar relatorio." }, { status: 500 });
  }
}
