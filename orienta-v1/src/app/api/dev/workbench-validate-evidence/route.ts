import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ensureResponseAccess } from "@/lib/api/tenant-guard";
import { logError } from "@/lib/observability/logger";

const payloadSchema = z.object({
  responseId: z.string().uuid(),
  analystUserId: z.string().uuid(),
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

export async function POST(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["analyst"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { responseId, analystUserId, status, justification } = parsed.data;
  const tenantError = await ensureResponseAccess(context!, responseId);
  if (tenantError) return tenantError;
  if (context?.role !== "admin" && context?.userId !== analystUserId) {
    return NextResponse.json({ error: "Usuario divergente do token informado." }, { status: 403 });
  }

  try {
    let evidenceId: string;
    const { data: evidence, error: evidenceError } = await supabase
      .from("evidences")
      .select("id")
      .eq("response_id", responseId)
      .limit(1)
      .maybeSingle();
    if (evidenceError) throw evidenceError;

    if (!evidence) {
      const { data: response, error: responseError } = await supabase
        .from("responses")
        .select("created_by")
        .eq("id", responseId)
        .single();
      if (responseError) throw responseError;

      const { data: insertedEvidence, error: insertedEvidenceError } = await supabase
        .from("evidences")
        .insert({
          response_id: responseId,
          external_link: "https://exemplo.rn.gov/evidencia",
          exception_reason: "Validacao em ambiente de homologacao",
          title: "Evidencia registrada pela Area de Trabalho",
          description: "Registro automatizado para fluxo de validacao em homologacao",
          evidence_type: "documento",
          submitted_by: response.created_by,
        })
        .select("id")
        .single();
      if (insertedEvidenceError) throw insertedEvidenceError;
      evidenceId = insertedEvidence.id;
    } else {
      evidenceId = evidence.id;
    }

    const { data: validation, error: validationError } = await supabase
      .from("evidence_validations")
      .insert({
        evidence_id: evidenceId,
        status,
        validated_by: analystUserId,
        justification: status === "waived" ? justification ?? "Dispensa justificada em homologacao." : null,
      })
      .select("id,status,validated_at")
      .single();
    if (validationError) throw validationError;

    return NextResponse.json({ validation });
  } catch (error) {
    logError("Failed to validate evidence", error, { route: "/api/dev/workbench-validate-evidence" });
    const message = error instanceof Error ? error.message : "Falha ao validar evidencia.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
