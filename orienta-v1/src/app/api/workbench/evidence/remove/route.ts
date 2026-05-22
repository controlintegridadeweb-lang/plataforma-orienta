import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { removeWorkbenchEvidence } from "@/lib/workbench/remove-workbench-evidence";
import { logError } from "@/lib/observability/logger";

const bodySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
  questionId: z.string().uuid(),
  draftStoragePath: z.string().min(1).max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON invalido." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenantError = ensureOrganizationAccess(context!, parsed.data.organizationId);
  if (tenantError) return tenantError;

  try {
    const supabase = createSupabaseServiceRoleClient();
    const result = await removeWorkbenchEvidence(supabase, {
      organizationId: parsed.data.organizationId,
      formId: parsed.data.formId,
      questionId: parsed.data.questionId,
      draftStoragePath: parsed.data.draftStoragePath,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    const fami = await triggerFamiReprocess(
      parsed.data.formId,
      parsed.data.organizationId,
      "evidence_removed",
    );

    return NextResponse.json({ ok: true, famiReprocess: fami });
  } catch (error) {
    logError("Failed to remove workbench evidence", error, {
      route: "/api/workbench/evidence/remove",
    });
    const message = error instanceof Error ? error.message : "Falha ao remover evidencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
