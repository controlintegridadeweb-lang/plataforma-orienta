import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { handleActionPlansError } from "@/lib/action-plans/http";
import { logError } from "@/lib/observability/logger";

type RouteContext = { params: Promise<{ planId: string }> };

/**
 * Auditoria do plano para o respondente.
 *
 * Reutiliza `ActionPlansAdminService.listPlanAudit`, que ja aplica
 * `enforceOrgScope` para usuarios nao-admin — entao um respondente so
 * consegue ver auditoria de planos vinculados a recomendacoes da propria
 * organizacao.
 */
export async function GET(request: Request, ctx: RouteContext) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  if (!context?.organizationId) {
    return NextResponse.json(
      { error: "Usuario sem organizacao vinculada." },
      { status: 403 },
    );
  }

  const { planId } = await ctx.params;
  try {
    const service = new ActionPlansAdminService();
    const entries = await service.listPlanAudit(planId, {
      role: "respondent",
      organizationId: context.organizationId,
    });
    return NextResponse.json({ entries });
  } catch (error) {
    logError("Failed to list respondent action plan audit", error, {
      route: "/api/respondent/action-plans/[planId]/audit",
      planId,
    });
    return handleActionPlansError(error);
  }
}
