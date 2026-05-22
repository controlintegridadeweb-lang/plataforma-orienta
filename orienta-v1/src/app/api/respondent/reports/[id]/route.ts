import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };

const paramsSchema = z.object({
  id: z.string().uuid(),
});

/**
 * Remove registro de historico de relatorio (linha em `reports`) da propria organizacao.
 * O arquivo PDF nao e armazenado em bucket; apenas o registro de auditoria e removido.
 */
export async function DELETE(request: Request, ctx: RouteContext) {
  const { context, error } = await requireAuth(request, ["respondent"]);
  if (error) return error;
  const ctxUser = context!;
  if (!ctxUser.organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const parsed = paramsSchema.safeParse({ id });
  if (!parsed.success) {
    return NextResponse.json({ error: "ID invalido." }, { status: 400 });
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: row, error: findErr } = await supabase
    .from("reports")
    .select("id, organization_id")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (findErr) throw findErr;
  if (!row || row.organization_id !== ctxUser.organizationId) {
    return NextResponse.json({ error: "Registro nao encontrado." }, { status: 404 });
  }

  const { error: delErr } = await supabase.from("reports").delete().eq("id", parsed.data.id);
  if (delErr) throw delErr;

  return NextResponse.json({ ok: true });
}
