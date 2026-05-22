import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import {
  maturityByAxisGlobal,
  maturityDashboardAvailableYearsForOrganization,
} from "@/lib/dashboards/queries";
import { buildFamiMaturityView } from "@/lib/fami/fami-maturity-view";
import { logError } from "@/lib/observability/logger";

const querySchema = z.object({
  organizationId: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1900).max(2100).optional(),
});

export async function GET(request: Request) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;

  const url = new URL(request.url);
  const rawOrg = url.searchParams.get("organizationId");
  const parsed = querySchema.safeParse({
    organizationId: rawOrg && rawOrg.length > 0 ? rawOrg : undefined,
    year: url.searchParams.get("year") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const orgId = parsed.data.organizationId;
    const yearFilter = parsed.data.year ?? undefined;

    if (orgId) {
      const [view, availableYears] = await Promise.all([
        buildFamiMaturityView({
          kind: "latest-org",
          organizationId: orgId,
          closingYear: yearFilter ?? undefined,
        }),
        maturityDashboardAvailableYearsForOrganization(orgId),
      ]);
      if (!view) {
        return NextResponse.json({
          items: [],
          scope: "organization" as const,
          organizationId: orgId,
          snapshotYearApplied: yearFilter ?? null,
          availableYears,
          globalPercentage: null,
          formId: null,
          formName: null,
          formState: null,
          isOfficialScore: false,
          applicableQuestions: 0,
          waivedQuestions: 0,
          reprocessedAt: null,
        });
      }
      return NextResponse.json({
        items: view.axes,
        scope: "organization" as const,
        organizationId: orgId,
        snapshotYearApplied: yearFilter ?? null,
        availableYears,
        globalPercentage: view.global.percentage,
        formId: view.formId,
        formName: view.formName,
        formState: view.formState,
        isOfficialScore: view.meta.isOfficialScore,
        applicableQuestions: view.meta.applicableQuestions,
        waivedQuestions: view.meta.waivedQuestions,
        reprocessedAt: view.meta.reprocessedAt,
      });
    }

    const items = await maturityByAxisGlobal(yearFilter ?? undefined);
    return NextResponse.json({
      items,
      scope: "global" as const,
      organizationId: null,
      snapshotYearApplied: yearFilter ?? null,
      availableYears: [] as number[],
      globalPercentage: null,
      formId: null,
      formName: null,
      formState: null,
      isOfficialScore: false,
      applicableQuestions: 0,
      waivedQuestions: 0,
      reprocessedAt: null,
    });
  } catch (error) {
    logError("Failed to load dashboard maturity by axis", error, {
      route: "/api/admin/dashboard/maturity-by-axis",
    });
    const message =
      error instanceof Error ? error.message : "Falha ao carregar maturidade por eixo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
