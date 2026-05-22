import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { RespondentReportHistoryRow } from "@/lib/reports/respondent-presentation";
import { defaultReportKindForOfficialPdf } from "@/lib/reports/respondent-presentation";

/**
 * Historico de relatorios oficiais persistidos na organizacao do respondente.
 */
export async function GET(request: Request) {
  const { context, error } = await requireAuth(request, ["respondent"]);
  if (error) return error;
  const ctx = context!;
  if (!ctx.organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: rows, error: qErr } = await supabase
    .from("reports")
    .select(
      "id, form_id, organization_id, processing_version, generated_by, file_path, generated_at",
    )
    .eq("organization_id", ctx.organizationId)
    .order("generated_at", { ascending: false })
    .limit(200);
  if (qErr) throw qErr;

  const formIds = [...new Set((rows ?? []).map((r) => r.form_id as string))];
  const formById = new Map<string, { name: string; version: number | null }>();
  if (formIds.length > 0) {
    const { data: formRows, error: fErr } = await supabase
      .from("forms")
      .select("id,name,version")
      .in("id", formIds);
    if (fErr) throw fErr;
    for (const f of formRows ?? []) {
      formById.set(f.id as string, {
        name: String(f.name ?? ""),
        version: f.version != null ? Number(f.version) : null,
      });
    }
  }

  const items: RespondentReportHistoryRow[] = (rows ?? []).map((r) => {
    const formMeta = formById.get(r.form_id as string);
    const formName = formMeta?.name || "Formulario";
    const formTemplateVersion = formMeta?.version ?? null;
    const genBy = r.generated_by as string;
    const shortId = genBy.replace(/-/g, "").slice(0, 8);
    return {
      id: r.id as string,
      formId: r.form_id as string,
      formName,
      formTemplateVersion,
      organizationId: r.organization_id as string,
      processingVersion: Number(r.processing_version ?? 0),
      generatedBy: genBy,
      generatedByLabel:
        genBy === ctx.userId ? "Você" : `Usuário · …${shortId}`,
      filePath: String(r.file_path ?? ""),
      generatedAt: String(r.generated_at ?? ""),
      format: "pdf" as const,
      reportKind: defaultReportKindForOfficialPdf(),
      status: "completed" as const,
    };
  });

  return NextResponse.json({ viewerUserId: ctx.userId, items });
}
