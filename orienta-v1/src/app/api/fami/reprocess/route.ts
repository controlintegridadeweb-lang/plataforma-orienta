import { NextResponse } from "next/server";
import { z } from "zod";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { logError } from "@/lib/observability/logger";

const payloadSchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export async function POST(request: Request) {
  const { context, error } = await requireAuth(request, ["admin"]);
  if (error) return error;

  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    if (!isGlobalAdmin(context!)) {
      const tenantError = ensureOrganizationAccess(context!, parsed.data.organizationId);
      if (tenantError) return tenantError;
    }

    const result = await triggerFamiReprocess(
      parsed.data.formId,
      parsed.data.organizationId,
      "manual_reprocess",
      { throwOnError: true },
    );
    if (!result) {
      return NextResponse.json({ error: "Failed to reprocess FAMI." }, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error) {
    logError("Failed to reprocess FAMI", error, { route: "/api/fami/reprocess" });
    const message = error instanceof Error ? error.message : "Failed to reprocess FAMI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
