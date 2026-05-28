import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureEvidenceAccess } from "@/lib/api/tenant-guard";
import {
  EvidencesAdminService,
  EvidencesValidationError,
} from "@/lib/evidences/admin-service";
import { handleEvidencesError } from "@/lib/evidences/http";
import { logError, logInfo } from "@/lib/observability/logger";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";

type RouteContext = { params: Promise<{ evidenceId: string }> };

const idSchema = z.string().uuid();

function parseId(value: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new EvidencesValidationError([
      { path: "evidenceId", message: "evidenceId invalido." },
    ]);
  }
  return parsed.data;
}

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;
  try {
    const { evidenceId: raw } = await context.params;
    const evidenceId = parseId(raw);

    const tenantError = await ensureEvidenceAccess(authContext!, evidenceId);
    if (tenantError) return tenantError;

    const payload = await request.json();
    const service = new EvidencesAdminService();
    const { entry, scope } = await service.validate(
      evidenceId,
      payload,
      authContext!.userId,
    );

    // Apos qualquer validacao da evidencia, regeramos as recomendacoes do
    // par (form, organizacao) para que o cenario refletido seja o atual:
    //  - aprovada/dispensada -> sai do "sim_sem_evidencia" e nao gera
    //    recomendacao ou move para "sim_evidencia_valida".
    //  - reprovada/parcial -> migra para "sim_evidencia_invalida".
    //  - complementacao -> mantem cenario sem evidencia.
    // Falhas aqui nao devem impedir o registro da validacao — logamos e
    // seguimos.
    let recommendationsCreated: number | null = null;
    if (scope) {
      const result = await triggerFamiReprocess(
        scope.formId,
        scope.organizationId,
        "evidence_validated",
      );
      if (result) {
        recommendationsCreated = result.recommendationsCreated;
        logInfo("evidences.admin.validated.reprocessed", {
          evidenceId,
          formId: scope.formId,
          organizationId: scope.organizationId,
          processingVersion: result.processingVersion,
          recommendationsCreated: result.recommendationsCreated,
        });
      }
    }

    return NextResponse.json({ validation: entry, recommendationsCreated });
  } catch (error) {
    logError("Failed to validate evidence", error, {
      route: "/api/admin/evidences/:evidenceId/validate",
    });
    return handleEvidencesError(error);
  }
}
