import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { ensureOrganizationAccess } from "@/lib/api/tenant-guard";
import { FAMI_ALL_FORMS } from "@/lib/fami/constants";
import {
  buildFamiSnapshotInstitutionalForYear,
  getAvailableFamiYearsInstitutional,
  getFamiEvolutionInstitutionalByYear,
  getFamiSnapshotInstitutional,
  getInstitutionalFormScores,
  getLatestFamiMetaInstitutional,
} from "@/lib/fami/institutional-snapshot";
import {
  buildFamiSnapshotForYear,
  getAvailableFamiYears,
  getFamiEvolution,
  getFamiEvolutionByYear,
  getFamiSnapshotGlobal,
  getFamiSnapshotLatest,
  getLatestFamiVersionForFormGlobal,
  getLatestFamiVersionForFormOrg,
} from "@/lib/fami/queries";
import { logError } from "@/lib/observability/logger";

/**
 * `organizationId` aceita um UUID (escopo de organizacao) ou o sentinela "all"
 * (visao Geral / todas as organizacoes). A visao Geral e restrita a admins.
 *
 * Query opcional `year`: snapshot de fechamento daquele ano civil (BRT) para o par form/org.
 */
const querySchema = z.object({
  formId: z.union([z.string().uuid(), z.literal("all")]),
  organizationId: z.union([z.string().uuid(), z.literal("all")]),
  year: z
    .union([z.coerce.number().int().min(1900).max(2100), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v == null ? undefined : v)),
  evolutionMode: z.enum(["versions", "years"]).optional(),
});

export async function GET(request: Request) {
  const { context, error: authError } = await requireAuth(request, [
    "admin",
    "analyst",
    "respondent",
  ]);
  if (authError) return authError;

  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    formId: url.searchParams.get("formId"),
    organizationId: url.searchParams.get("organizationId"),
    year: url.searchParams.get("year") ?? undefined,
    evolutionMode: url.searchParams.get("evolutionMode") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { formId, organizationId, year, evolutionMode } = parsed.data;
  const isOrgGlobal = organizationId === "all";
  const isAllForms = formId === FAMI_ALL_FORMS;

  if (isOrgGlobal && isAllForms) {
    return NextResponse.json(
      { error: "Selecione um formulario ou uma organizacao especifica." },
      { status: 400 },
    );
  }

  if (isOrgGlobal) {
    if (context!.role !== "admin") {
      return NextResponse.json(
        { error: "Visao Geral disponivel apenas para administradores." },
        { status: 403 },
      );
    }
  } else if (isAllForms) {
    if (context!.role !== "admin") {
      const tenantError = ensureOrganizationAccess(context!, organizationId);
      if (tenantError) return tenantError;
    }
  } else if (context!.role !== "admin") {
    const tenantError = ensureOrganizationAccess(context!, organizationId);
    if (tenantError) return tenantError;
  }

  try {
    if (isOrgGlobal) {
      const [snapshot, versionMeta] = await Promise.all([
        getFamiSnapshotGlobal(formId),
        getLatestFamiVersionForFormGlobal(formId),
      ]);
      return NextResponse.json({
        snapshot,
        evolution: [],
        evolutionByYear: [],
        availableYears: [],
        latestVersionMeta: versionMeta,
        evolutionModeUsed: evolutionMode ?? "years",
        yearRequested: year ?? null,
        scopeKind: "form_all_orgs",
      });
    }

    if (isAllForms) {
      const evolutionModeUsed = evolutionMode ?? "years";
      const [availableYears, versionMeta, evolutionByYear, snapshot, formBreakdown] =
        await Promise.all([
          getAvailableFamiYearsInstitutional(organizationId),
          getLatestFamiMetaInstitutional(organizationId),
          getFamiEvolutionInstitutionalByYear(organizationId),
          year != null
            ? buildFamiSnapshotInstitutionalForYear(organizationId, year)
            : getFamiSnapshotInstitutional(organizationId),
          getInstitutionalFormScores(organizationId),
        ]);
      return NextResponse.json({
        snapshot,
        evolution: [],
        evolutionByYear: evolutionModeUsed === "years" ? evolutionByYear : [],
        availableYears,
        latestVersionMeta: versionMeta,
        evolutionModeUsed,
        yearRequested: year ?? null,
        scopeKind: "org_all_forms",
        formBreakdown,
      });
    }

    const evolutionModeUsed = evolutionMode ?? "years";

    const [availableYears, versionMeta, evolutionPayload, snapshot] = await Promise.all([
      getAvailableFamiYears(formId, organizationId),
      getLatestFamiVersionForFormOrg(formId, organizationId),
      evolutionModeUsed === "versions"
        ? getFamiEvolution(formId, organizationId)
        : getFamiEvolutionByYear(formId, organizationId),
      year != null
        ? buildFamiSnapshotForYear(formId, organizationId, year)
        : getFamiSnapshotLatest(formId, organizationId),
    ]);

    const evolution = evolutionModeUsed === "versions" ? evolutionPayload : [];
    const evolutionByYear =
      evolutionModeUsed === "years"
        ? evolutionPayload
        : [];

    return NextResponse.json({
      snapshot,
      evolution,
      evolutionByYear,
      availableYears,
      latestVersionMeta: versionMeta,
      evolutionModeUsed,
      yearRequested: year ?? null,
      scopeKind: "form_org",
    });
  } catch (error) {
    logError("Failed to load FAMI snapshot", error, {
      route: "/api/admin/fami/snapshot",
    });
    const message =
      error instanceof Error ? error.message : "Falha ao carregar maturidade FAMI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
