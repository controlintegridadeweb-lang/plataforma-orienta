import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureResponseAccess } from "@/lib/api/tenant-guard";
import {
  EvidencesAdminService,
  EvidencesValidationError,
} from "@/lib/evidences/admin-service";
import { handleEvidencesError } from "@/lib/evidences/http";
import { logError, logInfo } from "@/lib/observability/logger";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const payloadSchema = z.object({
  responseId: z.string().uuid(),
  status: z.enum([
    "pending",
    "approved",
    "invalidated",
    "adjustment_requested",
  ]),
  justification: z.string().optional(),
});

/**
 * Compatibilidade legada: valida evidência por responseId delegando a EvidencesAdminService.
 * Preferir POST /api/admin/evidences/:evidenceId/validate na fila admin.
 */
export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { responseId, status, justification } = parsed.data;
  const tenantError = await ensureResponseAccess(context!, responseId);
  if (tenantError) return tenantError;

  const supabase = createSupabaseServiceRoleClient();

  try {
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidences")
      .select("id")
      .eq("response_id", responseId)
      .limit(1)
      .maybeSingle();
    if (evidenceError) throw evidenceError;

    if (!evidence) {
      return NextResponse.json(
        {
          error:
            "Nao ha evidencia registrada para esta resposta. Anexe ou registre evidencia antes de validar.",
        },
        { status: 409 },
      );
    }

    const service = new EvidencesAdminService();
    const { entry, scope } = await service.validate(
      evidence.id,
      { status, justification },
      context!.userId,
    );

    let recommendationsCreated: number | null = null;
    if (scope) {
      const result = await triggerFamiReprocess(
        scope.formId,
        scope.organizationId,
        "evidence_validated",
      );
      if (result) {
        recommendationsCreated = result.recommendationsCreated;
        logInfo("workbench.validate-evidence.reprocessed", {
          evidenceId: evidence.id,
          responseId,
          formId: scope.formId,
          organizationId: scope.organizationId,
          recommendationsCreated: result.recommendationsCreated,
        });
      }
    }

    return NextResponse.json({ validation: entry, famiReprocess: scope ? { recommendationsCreated } : null });
  } catch (error) {
    if (error instanceof EvidencesValidationError) {
      return handleEvidencesError(error);
    }
    logError("Failed to validate evidence", error, { route: "/api/workbench/validate-evidence" });
    const message = error instanceof Error ? error.message : "Falha ao validar evidencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
