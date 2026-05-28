import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { BindingService, SnapshotService } from "@/lib/library/binding-service";
import { handleLibraryError } from "@/lib/library/http";
import { LibraryValidationError } from "@/lib/library/service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/observability/logger";
import { canTransition } from "@/lib/domain/workflow";
import type { WorkflowState } from "@/lib/domain/types";

type RouteContext = { params: Promise<{ formId: string }> };

const idSchema = z.string().uuid();
const payloadSchema = z
  .object({
    action: z.enum(["publish", "approve"]).optional(),
  })
  .optional();

function parseId(value: string, label: string) {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    throw new LibraryValidationError([
      { path: label, message: `${label} invalido.` },
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
    const parsedPayload = payloadSchema.safeParse(await request.json().catch(() => undefined));
    if (!parsedPayload.success) {
      throw new LibraryValidationError([
        { path: "action", message: "Acao invalida. Use publish ou approve." },
      ]);
    }
    const payload = parsedPayload.data;
    const { formId: rawId } = await context.params;
    const formId = parseId(rawId, "formId");

    const supabase = createSupabaseServiceRoleClient();
    const { data: form, error: formErr } = await supabase
      .from("forms")
      .select("id,name,version,state,archived_at,created_at")
      .eq("id", formId)
      .maybeSingle();
    if (formErr) throw formErr;
    if (!form) {
      throw new LibraryValidationError([
        { path: "formId", message: "Formulario nao encontrado." },
      ]);
    }
    if (form.archived_at) {
      throw new LibraryValidationError([
        { path: "formId", message: "Nao e possivel publicar/aprovar formulario arquivado." },
      ]);
    }

    const currentState = form.state as WorkflowState;
    const requestedAction = payload?.action;
    const action =
      requestedAction ??
      (currentState === "under_review" ? "approve" : "publish");
    const nextState: WorkflowState =
      action === "approve" ? "consolidated" : "submitted";

    if (!canTransition(currentState, nextState)) {
      throw new LibraryValidationError([
        {
          path: "state",
          message: `Transicao invalida: ${currentState} -> ${nextState}.`,
        },
      ]);
    }

    const bindingService = new BindingService(supabase);
    const missing = await bindingService.listMissingForForm(formId);
    if (missing.length > 0) {
      return NextResponse.json(
        {
          error: "Binding incompleto.",
          pending: missing,
        },
        { status: 409 },
      );
    }

    const snapshotService = new SnapshotService(supabase);
    const result = await snapshotService.captureForForm({
      formId,
      formVersion: form.version as number,
    });
    const captured = result.captured;
    const snapshots = result.snapshots;

    logInfo(
      action === "approve" ? "library.form.approved" : "library.form.published",
      {
        formId,
        formVersion: form.version,
        captured,
        action,
        previousState: currentState,
        nextState,
        actorUserId: authContext?.userId ?? null,
      },
    );

    const { data: updatedForm, error: updateErr } = await supabase
      .from("forms")
      .update({ state: nextState })
      .eq("id", formId)
      .select("id,name,version,state,archived_at,created_at")
      .single();
    if (updateErr) throw updateErr;

    return NextResponse.json({
      formId,
      formVersion: updatedForm.version,
      action,
      captured,
      snapshots,
      form: {
        id: updatedForm.id,
        name: updatedForm.name,
        version: updatedForm.version,
        state: updatedForm.state,
        archivedAt: updatedForm.archived_at,
        createdAt: updatedForm.created_at,
        questionCount: null,
      },
    });
  } catch (error) {
    logError("Failed to transition form lifecycle", error, {
      route: "/api/admin/forms/:formId/publish",
    });
    return handleLibraryError(error);
  }
}
