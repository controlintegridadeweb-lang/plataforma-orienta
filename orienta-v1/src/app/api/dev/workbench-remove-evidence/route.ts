import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { removeWorkbenchEvidence } from "@/lib/workbench/remove-workbench-evidence";
import { logError } from "@/lib/observability/logger";

const bodySchema = z.object({
  respondentUserId: z.string().uuid(),
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
  questionId: z.string().uuid(),
  draftStoragePath: z.string().min(1).max(2000).optional().nullable(),
});

export async function POST(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
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

  const { respondentUserId, ...payload } = parsed.data;
  const tenantError = ensureOrganizationAccess(context!, payload.organizationId);
  if (tenantError) return tenantError;
  if (context?.role !== "admin" && context?.userId !== respondentUserId) {
    return NextResponse.json({ error: "Usuario divergente do token informado." }, { status: 403 });
  }

  try {
    const supabase = createSupabaseServiceRoleClient();
    const result = await removeWorkbenchEvidence(supabase, {
      organizationId: payload.organizationId,
      formId: payload.formId,
      questionId: payload.questionId,
      draftStoragePath: payload.draftStoragePath,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    logError("Failed to remove workbench evidence (dev)", error, {
      route: "/api/dev/workbench-remove-evidence",
    });
    const message = error instanceof Error ? error.message : "Falha ao remover evidencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
