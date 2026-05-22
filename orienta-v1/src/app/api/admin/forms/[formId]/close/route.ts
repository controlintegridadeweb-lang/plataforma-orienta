import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/domain/workflow";
import type { WorkflowState } from "@/lib/domain/types";
import { triggerFamiReprocessForForm } from "@/lib/fami/trigger-reprocess";
import { logError, logInfo } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();

const closeBodySchema = z.object({
  confirm: z.literal(true).optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
  ]);
  if (authError) return authError;

  const { formId: raw } = await context.params;
  const parsedId = idSchema.safeParse(raw);
  if (!parsedId.success) {
    return NextResponse.json({ error: "formId invalido." }, { status: 400 });
  }
  const formId = parsedId.data;

  const body = await request.json().catch(() => ({}));
  const parsedBody = closeBodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("id,state,closed_at,response_deadline_at")
    .eq("id", formId)
    .maybeSingle();
  if (formErr) {
    logError("Failed to load form for close", formErr, {
      route: "/api/admin/forms/:formId/close",
    });
    return NextResponse.json({ error: "Falha ao carregar formulario." }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Formulario nao encontrado." }, { status: 404 });
  }

  const currentState = form.state as WorkflowState;
  if (currentState === "closed") {
    return NextResponse.json(
      { error: "Formulario ja esta encerrado.", form },
      { status: 409 },
    );
  }
  if (!canTransition(currentState, "closed")) {
    return NextResponse.json(
      {
        error:
          "Encerramento exige formulario consolidado. Aprove a consolidacao antes de encerrar o ciclo.",
        currentState,
      },
      { status: 409 },
    );
  }
  if (!form.response_deadline_at) {
    return NextResponse.json(
      {
        error:
          "Defina o prazo de resposta na aba Configuracao antes de encerrar o ciclo.",
        currentState,
      },
      { status: 409 },
    );
  }

  const closedAt = new Date().toISOString();
  const { error: updErr } = await supabase
    .from("forms")
    .update({ state: "closed", closed_at: closedAt })
    .eq("id", formId);
  if (updErr) {
    logError("Failed to close form", updErr, {
      route: "/api/admin/forms/:formId/close",
    });
    return NextResponse.json({ error: "Falha ao encerrar formulario." }, { status: 500 });
  }

  logInfo("form.closed", { formId, actorId: authContext!.userId, closedAt });

  const batch = await triggerFamiReprocessForForm(formId, "form_closed", {
    includeAllOrganizations: true,
    mode: "closed",
  });

  return NextResponse.json({
    form: { id: formId, state: "closed", closedAt },
    famiReprocess: batch,
  });
}
