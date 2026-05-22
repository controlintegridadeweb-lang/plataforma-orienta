import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  evidenceStatusBreakdown,
  evidenceStatusBreakdownGlobal,
} from "@/lib/dashboards/queries";
import { logError } from "@/lib/observability/logger";

const querySchema = z.object({
  organizationId: z.string().uuid().optional(),
});

export async function GET(request: Request) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const rawOrg = url.searchParams.get("organizationId");
  const parsed = querySchema.safeParse({
    organizationId: rawOrg && rawOrg.length > 0 ? rawOrg : undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const orgId = parsed.data.organizationId;
    const data = orgId
      ? await evidenceStatusBreakdown(orgId)
      : await evidenceStatusBreakdownGlobal();
    return NextResponse.json({
      data,
      scope: orgId ? ("organization" as const) : ("global" as const),
      organizationId: orgId ?? null,
    });
  } catch (error) {
    logError("Failed to load dashboard evidence status", error, {
      route: "/api/admin/dashboard/evidence-status",
    });
    const message =
      error instanceof Error ? error.message : "Falha ao carregar status das evidencias.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
