import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

/**
 * Opcoes de escopo para geracao de relatorio oficial (organizacoes e formularios com FAMI global persistido).
 */
export async function GET(request: Request) {
  const { context, error } = await requireAuth(request, ["admin", "analyst", "respondent"]);
  if (error) return error;
  const ctx = context!;

  const supabase = createSupabaseServiceRoleClient();

  let organizations: { id: string; name: string }[] = [];
  if (ctx.role === "respondent") {
    if (!ctx.organizationId) {
      return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
    }
    const { data } = await supabase
      .from("organizations")
      .select("id,name")
      .eq("id", ctx.organizationId)
      .maybeSingle();
    organizations = data ? [{ id: data.id as string, name: String(data.name) }] : [];
  } else {
    const { data, error: orgErr } = await supabase.from("organizations").select("id,name").order("name");
    if (orgErr) throw orgErr;
    organizations = (data ?? []).map((r) => ({
      id: r.id as string,
      name: String(r.name),
    }));
  }

  const url = new URL(request.url);
  const organizationId = url.searchParams.get("organizationId");

  let forms: {
    id: string;
    name: string;
    version: number;
    latestProcessingVersion: number;
  }[] = [];
  if (organizationId) {
    const tenantErr = ensureOrganizationAccess(ctx, organizationId);
    if (tenantErr) return tenantErr;

    const { data: famiRows, error: famiErr } = await supabase
      .from("fami_results")
      .select("form_id,processing_version")
      .eq("organization_id", organizationId)
      .eq("scope_type", "global");
    if (famiErr) throw famiErr;

    const maxProcByForm = new Map<string, number>();
    for (const r of famiRows ?? []) {
      const fid = r.form_id as string;
      const pv = Number(r.processing_version ?? 0);
      maxProcByForm.set(fid, Math.max(maxProcByForm.get(fid) ?? 0, pv));
    }

    const formIds = [...new Set((famiRows ?? []).map((r) => r.form_id as string))];
    if (formIds.length > 0) {
      const { data: formRows, error: formsErr } = await supabase
        .from("forms")
        .select("id,name,version")
        .in("id", formIds)
        .order("name");
      if (formsErr) throw formsErr;
      forms = (formRows ?? []).map((r) => ({
        id: r.id as string,
        name: String(r.name),
        version: Number(r.version ?? 0),
        latestProcessingVersion: maxProcByForm.get(r.id as string) ?? 0,
      }));
    }
  }

  return NextResponse.json({ organizations, forms });
}
