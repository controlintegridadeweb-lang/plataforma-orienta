import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { assertDevOnly } from "@/lib/api/dev-only";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { logError } from "@/lib/observability/logger";
import { loadWorkbenchPayload } from "@/lib/workbench/load-workbench-payload";

const querySchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export async function GET(request: Request) {
  const devOnlyError = assertDevOnly();
  if (devOnlyError) return devOnlyError;
  const { context, error: authError } = await requireAuth(request, ["admin", "respondent"]);
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
    const { form, rows } = await loadWorkbenchPayload(supabase, formId, organizationId);
    return NextResponse.json({ form, rows });
  } catch (error) {
    logError("Failed to load workbench data", error, { route: "/api/dev/workbench-data" });
    const message = error instanceof Error ? error.message : "Falha ao carregar workbench.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
