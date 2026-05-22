import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { respondentProgress } from "@/lib/dashboards/queries";
import {
  clampRespondentDashboardYear,
  defaultRespondentDashboardYear,
  RESPONDENT_DASHBOARD_MAX_YEAR,
  RESPONDENT_DASHBOARD_MIN_YEAR,
} from "@/lib/dashboards/respondent-dashboard-year";
import { logError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(RESPONDENT_DASHBOARD_MIN_YEAR)
    .max(RESPONDENT_DASHBOARD_MAX_YEAR)
    .optional(),
});

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent"]);
  if (authError) return authError;
  const organizationId = context?.organizationId;
  if (!organizationId) {
    return NextResponse.json({ error: "Usuario sem organizacao vinculada." }, { status: 403 });
  }

  try {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse({
      year: url.searchParams.get("year") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Parametros de periodo invalidos." }, { status: 400 });
    }

    const year = clampRespondentDashboardYear(
      parsed.data.year ?? defaultRespondentDashboardYear(),
    );

    const items = await respondentProgress(organizationId, { year });
    return NextResponse.json({ items, year });
  } catch (error) {
    logError("Failed to load respondent dashboard forms progress", error, {
      route: "/api/respondent/dashboard/forms-progress",
    });
    const message = error instanceof Error ? error.message : "Falha ao carregar formularios.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
