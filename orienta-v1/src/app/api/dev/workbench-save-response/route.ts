import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { logError } from "@/lib/observability/logger";
import {
  saveWorkbenchResponseWithEvidence,
  workbenchResponseBodySchema,
} from "@/lib/workbench/save-workbench-response";

const devPayloadSchema = workbenchResponseBodySchema.extend({
  respondentUserId: z.string().uuid(),
});

export async function POST(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = devPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { respondentUserId, ...rest } = parsed.data;
  const tenantError = ensureOrganizationAccess(context!, rest.organizationId);
  if (tenantError) return tenantError;
  if (context?.role !== "admin" && context?.userId !== respondentUserId) {
    return NextResponse.json({ error: "Usuario divergente do token informado." }, { status: 403 });
  }

  try {
    const result = await saveWorkbenchResponseWithEvidence(
      supabase,
      { userId: respondentUserId },
      rest,
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, fields: result.fields },
        { status: result.status },
      );
    }
    const fami = await triggerFamiReprocess(rest.formId, rest.organizationId, "response_saved");
    return NextResponse.json({ response: result.response, famiReprocess: fami });
  } catch (error) {
    logError("Failed to save response", error, { route: "/api/dev/workbench-save-response" });
    const message = error instanceof Error ? error.message : "Falha ao salvar resposta.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
