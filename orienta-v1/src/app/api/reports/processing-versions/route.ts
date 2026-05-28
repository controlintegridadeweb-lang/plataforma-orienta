import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

const querySchema = z.object({
  organizationId: z.string().uuid(),
  formId: z.string().uuid(),
});

/**
 * Versoes de processamento FAMI (global) disponiveis para org + formulario.
 */
export async function GET(request: Request) {
  const { context, error } = await requireAuth(request, ["admin", "respondent"]);
  if (error) return error;
  const ctx = context!;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    organizationId: url.searchParams.get("organizationId"),
    formId: url.searchParams.get("formId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Parametros invalidos." }, { status: 400 });
  }

  const tenantErr = ensureOrganizationAccess(ctx, parsed.data.organizationId);
  if (tenantErr) return tenantErr;

  const supabase = createSupabaseServiceRoleClient();
  const { data, error: qErr } = await supabase
    .from("fami_results")
    .select("processing_version")
    .eq("organization_id", parsed.data.organizationId)
    .eq("form_id", parsed.data.formId)
    .eq("scope_type", "global");
  if (qErr) throw qErr;

  const versions = [
    ...new Set((data ?? []).map((r) => Number(r.processing_version ?? 0))),
  ].sort((a, b) => b - a);

  return NextResponse.json({ versions });
}
