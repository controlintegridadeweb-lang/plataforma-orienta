import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { canTransition } from "@/lib/domain/workflow";
import type { WorkflowState } from "@/lib/domain/types";
import { logError, logInfo } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();

/**
 * Reabre um formulário encerrado para novas respostas. O FAMI oficial
 * (último snapshot de encerramento) permanece até um novo fechamento.
 */
export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, [
    "admin",
  ]);
  if (authError) return authError;

  const { formId: raw } = await context.params;
  const parsedId = idSchema.safeParse(raw);
  if (!parsedId.success) {
    return NextResponse.json({ error: "formId invalido." }, { status: 400 });
  }
  const formId = parsedId.data;

  const supabase = createSupabaseServiceRoleClient();
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("id,state,closed_at")
    .eq("id", formId)
    .maybeSingle();
  if (formErr) {
    logError("Failed to load form for reopen", formErr, {
      route: "/api/admin/forms/:formId/reopen",
    });
    return NextResponse.json({ error: "Falha ao carregar formulario." }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Formulario nao encontrado." }, { status: 404 });
  }

  const currentState = form.state as WorkflowState;
  if (currentState !== "closed") {
    return NextResponse.json(
      { error: "Somente formularios encerrados podem ser reabertos.", currentState },
      { status: 409 },
    );
  }
  if (!canTransition(currentState, "draft")) {
    return NextResponse.json({ error: "Transicao de reabertura nao permitida." }, { status: 409 });
  }

  const { error: updErr } = await supabase
    .from("forms")
    .update({ state: "draft" })
    .eq("id", formId);
  if (updErr) {
    logError("Failed to reopen form", updErr, {
      route: "/api/admin/forms/:formId/reopen",
    });
    return NextResponse.json({ error: "Falha ao reabrir formulario." }, { status: 500 });
  }

  logInfo("form.reopened", {
    formId,
    actorId: authContext!.userId,
    previousClosedAt: form.closed_at,
  });

  return NextResponse.json({
    form: { id: formId, state: "draft", closedAt: form.closed_at },
    message:
      "Formulario reaberto para respostas. O FAMI oficial anterior permanece ate um novo encerramento.",
  });
}
