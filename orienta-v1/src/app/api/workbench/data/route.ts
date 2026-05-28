import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { loadWorkbenchPayload } from "@/lib/workbench/load-workbench-payload";
import { logError } from "@/lib/observability/logger";

const querySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
});

/**
 * Dados reais do workbench (formulario, questoes, respostas, evidencias) via
 * sessao do usuario ou token (requireAuth) — sem exigir ambiente de homolog.
 */
export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin", "respondent"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    formId: url.searchParams.get("formId"),
    organizationId: url.searchParams.get("organizationId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const organizationId = parsed.data.organizationId ?? context!.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organizacao nao informada e perfil sem organizacao." }, { status: 400 });
  }
  const tenantError = ensureOrganizationAccess(context!, organizationId);
  if (tenantError) return tenantError;

  const supabase = createSupabaseServiceRoleClient();
  const formId = parsed.data.formId;

  try {
    const { form, rows } = await loadWorkbenchPayload(supabase, formId, organizationId);
    return NextResponse.json({ form, rows });
  } catch (error) {
    logError("Failed to load workbench data", error, { route: "/api/workbench/data" });
    const message = error instanceof Error ? error.message : "Falha ao carregar workbench.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
