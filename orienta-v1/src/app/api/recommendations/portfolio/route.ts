import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { loadRecommendationsPortfolio } from "@/lib/recommendations/portfolio-query";
import { logError } from "@/lib/observability/logger";

const querySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

/**
 * Portfolio de recomendacoes (analista) — sessao + tenant; funciona fora de dev-only.
 */
export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["analyst", "admin"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    formId: url.searchParams.get("formId"),
    organizationId: url.searchParams.get("organizationId"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "formId e organizationId (UUID) sao obrigatorios." },
      { status: 400 },
    );
  }

  const { formId, organizationId } = parsed.data;
  const tenantError = ensureOrganizationAccess(context!, organizationId);
  if (tenantError) return tenantError;

  const supabase = createSupabaseServiceRoleClient();

  try {
    const payload = await loadRecommendationsPortfolio(supabase, formId, organizationId);
    return NextResponse.json(payload);
  } catch (error) {
    logError("Failed to load recommendations portfolio", error, { route: "/api/recommendations/portfolio" });
    const message =
      error instanceof Error ? error.message : "Falha ao carregar portfolio de recomendacoes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
