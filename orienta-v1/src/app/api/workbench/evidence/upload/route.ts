import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { logError } from "@/lib/observability/logger";

const MAX_BYTES = 50 * 1024 * 1024; // 50MB
const BUCKET = "evidencias";

const fieldsSchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid().optional(),
});

/**
 * Upload de arquivo para Supabase Storage; retorna storage_path para vincular na evidencia.
 */
export async function POST(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["admin", "respondent"]);
  if (authError) return authError;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Corpo invalido (use multipart/form-data)." }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Campo file e obrigatorio." }, { status: 400 });
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo invalido ou muito grande (max 50MB)." }, { status: 400 });
  }

  const rawForm = formData.get("formId");
  const rawOrg = formData.get("organizationId");
  const parsed = fieldsSchema.safeParse({
    formId: typeof rawForm === "string" ? rawForm : "",
    organizationId: typeof rawOrg === "string" && rawOrg.length > 0 ? rawOrg : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "formId e organizationId invalidos." }, { status: 400 });
  }

  const organizationId = parsed.data.organizationId ?? context!.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Organizacao nao informada e perfil sem organizacao." }, { status: 400 });
  }
  const tenantError = ensureOrganizationAccess(context!, organizationId);
  if (tenantError) return tenantError;

  const supabase = createSupabaseServiceRoleClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180) || "arquivo";
  const key = `${organizationId}/${parsed.data.formId}/${Date.now()}-${safeName}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(key, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });
    if (upErr) {
      if (/bucket|not found/i.test(upErr.message)) {
        return NextResponse.json(
          {
            error:
              "Bucket de armazenamento nao configurado. Aplique a migration 0014 ou crie o bucket 'evidencias' no Supabase.",
          },
          { status: 503 },
        );
      }
      throw upErr;
    }

    return NextResponse.json({ storagePath: key, bucket: BUCKET });
  } catch (error) {
    logError("Failed to upload evidence file", error, { route: "/api/workbench/evidence/upload" });
    const message = error instanceof Error ? error.message : "Falha no upload.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
