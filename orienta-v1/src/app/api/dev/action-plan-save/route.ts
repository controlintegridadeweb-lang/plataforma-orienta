import { NextResponse } from "next/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { saveActionPlanSchema } from "@/lib/action-plans/schemas";
import { ensureRecommendationAccess } from "@/lib/api/tenant-guard";
import { logError } from "@/lib/observability/logger";

/**
 * DEV: criar/atualizar acoes com as mesmas regras da API principal (formId obrigatorio).
 */
export async function POST(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const body = await request.json();
  const parsed = saveActionPlanSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const tenantError = await ensureRecommendationAccess(context!, parsed.data.recommendationId);
  if (tenantError) return tenantError;

  try {
    const svc = new ActionPlansAdminService();
    const result = await svc.save(parsed.data, {
      role: context!.role,
      organizationId: context!.organizationId,
    });
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to save action plan", error, { route: "/api/dev/action-plan-save" });
    const message = error instanceof Error ? error.message : "Falha ao salvar plano de acao.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
