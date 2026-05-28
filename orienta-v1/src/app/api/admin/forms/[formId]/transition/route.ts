import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  canTransition,
  isIntermediateTransition,
} from "@/lib/domain/workflow";
import type { WorkflowState } from "@/lib/domain/types";
import { logError, logInfo } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();
const bodySchema = z.object({
  to: z.enum([
    "draft",
    "submitted",
    "under_review",
    "complementation_requested",
    "resubmitted",
    "consolidated",
    "closed",
  ]),
});

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const { formId: raw } = await context.params;
  const parsedId = idSchema.safeParse(raw);
  if (!parsedId.success) {
    return NextResponse.json({ error: "formId invalido." }, { status: 400 });
  }
  const formId = parsedId.data;

  const body = await request.json().catch(() => null);
  const parsedBody = bodySchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }
  const to = parsedBody.data.to as WorkflowState;

  const supabase = createSupabaseServiceRoleClient();
  const { data: form, error: formErr } = await supabase
    .from("forms")
    .select("id,state,archived_at")
    .eq("id", formId)
    .maybeSingle();
  if (formErr) {
    logError("Failed to load form for transition", formErr, {
      route: "/api/admin/forms/:formId/transition",
    });
    return NextResponse.json({ error: "Falha ao carregar formulario." }, { status: 500 });
  }
  if (!form) {
    return NextResponse.json({ error: "Formulario nao encontrado." }, { status: 404 });
  }
  if (form.archived_at) {
    return NextResponse.json({ error: "Formulario arquivado nao pode mudar de estado." }, { status: 409 });
  }

  const from = form.state as WorkflowState;
  if (!canTransition(from, to)) {
    return NextResponse.json(
      { error: `Transicao invalida: ${from} -> ${to}.`, currentState: from },
      { status: 409 },
    );
  }

  if (!isIntermediateTransition(from, to)) {
    return NextResponse.json(
      {
        error: `Use o fluxo dedicado para ${from} -> ${to}.`,
        hint:
          to === "submitted"
            ? "publish"
            : to === "consolidated"
              ? "approve"
              : to === "closed"
                ? "close"
                : to === "draft" && from === "closed"
                  ? "reopen"
                  : undefined,
      },
      { status: 409 },
    );
  }

  const { error: updErr } = await supabase.from("forms").update({ state: to }).eq("id", formId);
  if (updErr) {
    logError("Failed to transition form", updErr, {
      route: "/api/admin/forms/:formId/transition",
    });
    return NextResponse.json({ error: "Falha ao atualizar estado." }, { status: 500 });
  }

  logInfo("form.transitioned", {
    formId,
    from,
    to,
    actorId: authContext!.userId,
  });

  return NextResponse.json({ form: { id: formId, state: to } });
}
