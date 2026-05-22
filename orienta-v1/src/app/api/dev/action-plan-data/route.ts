import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { logError } from "@/lib/observability/logger";

const querySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export async function GET(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    formId: url.searchParams.get("formId"),
    organizationId: url.searchParams.get("organizationId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { formId, organizationId } = parsed.data;
  const tenantError = ensureOrganizationAccess(context!, organizationId);
  if (tenantError) return tenantError;

  try {
    // sections/axes sem `!inner`: perguntas criadas via Biblioteca tem
    // section_id=null e dependem do vinculo. Inner join filtraria a row.
    const { data: recommendations, error } = await supabase
      .from("recommendations")
      .select(
        "id,recommendation_type,current_text,status,created_at,questions!inner(prompt,sections(name,axes(name))),action_plans(id,action_text,due_date,responsible_sector,responsible_name,status,observations,updated_at)",
      )
      .eq("form_id", formId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (recommendations ?? []).map((row) => {
      const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      const section = question?.sections
        ? Array.isArray(question.sections)
          ? question.sections[0]
          : question.sections
        : null;
      const axis = section?.axes
        ? Array.isArray(section.axes)
          ? section.axes[0]
          : section.axes
        : null;
      const plan = Array.isArray(row.action_plans) ? row.action_plans[0] : row.action_plans;

      return {
        recommendationId: row.id,
        recommendationType: row.recommendation_type,
        recommendationText: row.current_text,
        recommendationStatus: row.status,
        axisName: axis?.name ?? "",
        sectionName: section?.name ?? "",
        questionPrompt: question?.prompt ?? "",
        plan: plan
          ? {
              id: plan.id,
              actionText: plan.action_text,
              dueDate: plan.due_date,
              responsibleSector: plan.responsible_sector,
              responsibleName: plan.responsible_name,
              status: plan.status,
              observations: plan.observations,
              updatedAt: plan.updated_at,
            }
          : null,
      };
    });

    return NextResponse.json({ rows });
  } catch (error) {
    logError("Failed to load action plan data", error, { route: "/api/dev/action-plan-data" });
    const message = error instanceof Error ? error.message : "Falha ao carregar plano de acao.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
