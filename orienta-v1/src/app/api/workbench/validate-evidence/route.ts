import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureResponseAccess } from "@/lib/api/tenant-guard";
import {
  resolveFamiScopeFromResponseId,
  triggerFamiReprocess,
} from "@/lib/fami/trigger-reprocess";
import { logError } from "@/lib/observability/logger";

const payloadSchema = z.object({
  responseId: z.string().uuid(),
  status: z.enum([
    "pending",
    "valid",
    "invalid",
    "partially_valid",
    "complementation_requested",
    "waived",
  ]),
  justification: z.string().optional(),
});

/**
 * Validacao de evidencia por analista (producao; mesma regra de negocio de /api/dev/workbench-validate-evidence).
 */
export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["analyst", "admin"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { responseId, status, justification } = parsed.data;
  const tenantError = await ensureResponseAccess(context!, responseId);
  if (tenantError) return tenantError;

  const analystUserId = context!.userId;

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
    const evidenceId: string = evidence.id;

    const { data: validation, error: validationError } = await supabase
      .from("evidence_validations")
      .insert({
        evidence_id: evidenceId,
        status,
        validated_by: analystUserId,
        justification: status === "waived" ? justification ?? "Dispensa justificada." : null,
      })
      .select("id,status,validated_at")
      .single();
    if (validationError) throw validationError;

    const scope = await resolveFamiScopeFromResponseId(responseId);
    const famiReprocess = scope
      ? await triggerFamiReprocess(scope.formId, scope.organizationId, "evidence_validated")
      : null;

    return NextResponse.json({ validation, famiReprocess });
  } catch (error) {
    logError("Failed to validate evidence", error, { route: "/api/workbench/validate-evidence" });
    const message = error instanceof Error ? error.message : "Falha ao validar evidencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
