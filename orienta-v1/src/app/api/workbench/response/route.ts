import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { logError } from "@/lib/observability/logger";
import { saveWorkbenchResponseWithEvidence, workbenchResponseBodySchema } from "@/lib/workbench/save-workbench-response";

const requestSchema = workbenchResponseBodySchema.extend({
  organizationId: z.string().uuid().optional(),
});

/**
 * Grava resposta e, quando aplicavel, evidencia vinculada (mesmo request).
 * Regra: se a pergunta exige evidencia e a resposta for SIM, evidence e obrigatoria
 * (ou ja existir registro de evidencia para a resposta).
 */
export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin", "respondent"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const organizationId = parsed.data.organizationId ?? context!.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organizacao nao informada e perfil sem organizacao." }, { status: 400 });
  }
  const tenantError = ensureOrganizationAccess(context!, organizationId);
  if (tenantError) return tenantError;

  const payload = { ...parsed.data, organizationId };

  try {
    const result = await saveWorkbenchResponseWithEvidence(supabase, { userId: context!.userId }, payload);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fields: result.fields },
        { status: result.status },
      );
    }

    const fami = await triggerFamiReprocess(
      payload.formId,
      organizationId,
      "response_saved",
    );

    return NextResponse.json({
      response: result.response,
      famiReprocess: fami,
    });
  } catch (error) {
    logError("Failed to save response", error, { route: "/api/workbench/response" });
    const message = error instanceof Error ? error.message : "Falha ao salvar resposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
