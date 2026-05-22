import { NextResponse } from "next/server";
import { z } from "zod";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { isFormOpenForRespondent } from "@/lib/dashboards/queries";
import { logError, logInfo } from "@/lib/observability/logger";

const payloadSchema = z.object({
  formId: z.string().uuid(),
});

/**
 * Submissao do formulario pelo respondente.
 *
 * Dispara o reprocessamento (FAMI + recomendacoes) usando os bindings da
 * biblioteca vinculados na aba do formulario. As recomendacoes sao geradas
 * por cenario (resposta x evidencia) e ficam imediatamente visiveis na
 * area "Plano de acao" do respondente.
 *
 * Escopo: o respondente so pode submeter para a propria organizacao,
 * derivada do `profile.organization_id`. Nao recebe `organizationId` do
 * cliente justamente para evitar troca acidental ou maliciosa.
 */
export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  if (!context?.organizationId) {
    return NextResponse.json(
      { error: "Usuario sem organizacao vinculada." },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: form, error: formError } = await supabase
    .from("forms")
    .select("id,state")
    .eq("id", parsed.data.formId)
    .maybeSingle();
  if (formError) {
    logError("Failed to load form for respondent submit", formError, {
      route: "/api/respondent/forms/submit",
    });
    return NextResponse.json(
      { error: "Falha ao carregar o formulario." },
      { status: 500 },
    );
  }
  if (!form || !isFormOpenForRespondent(form.state as string)) {
    return NextResponse.json(
      { error: "Formulario nao esta disponivel para envio." },
      { status: 404 },
    );
  }

  try {
    const result = await triggerFamiReprocess(
      parsed.data.formId,
      context.organizationId,
      "form_submitted",
      { throwOnError: true },
    );
    if (!result) {
      return NextResponse.json(
        { error: "Falha ao calcular a pontuação FAMI após o envio." },
        { status: 500 },
      );
    }
    logInfo("respondente.formulario.submit", {
      formId: parsed.data.formId,
      organizationId: context.organizationId,
      recommendationsCreated: result.recommendationsCreated,
      processingVersion: result.processingVersion,
    });
    return NextResponse.json({
      processingVersion: result.processingVersion,
      recommendationsCreated: result.recommendationsCreated,
    });
  } catch (err) {
    logError("Failed to submit respondent form", err, {
      route: "/api/respondent/forms/submit",
      formId: parsed.data.formId,
      organizationId: context.organizationId,
    });
    const message = err instanceof Error ? err.message : "Falha ao enviar o formulario.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
