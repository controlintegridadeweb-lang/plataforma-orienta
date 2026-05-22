import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type {
  FamiEvolutionPoint,
  FamiEvolutionYearPoint,
  FamiSnapshot,
} from "@/lib/fami/queries";
import type { InstitutionalFormScore } from "@/lib/fami/constants";

type ApiError = { error: string };

async function parseJson<T>(response: Response): Promise<T> {
  const text = (await response.text()).trim();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
}

function buildAuthHeaders(role: "admin" | "analyst" | "respondent"): Record<string, string> {
  const defaults = getRuntimeDefaults();
  const userId =
    role === "admin"
      ? defaults.adminUserId
      : role === "analyst"
        ? defaults.analystUserId
        : defaults.respondentUserId;
  if (!userId) return {};
  return buildDevAuthHeaders(userId, role);
}

export type FamiSnapshotScopeKind = "form_org" | "org_all_forms" | "form_all_orgs";

export type FamiSnapshotResponse = {
  snapshot: FamiSnapshot | null;
  evolution: FamiEvolutionPoint[];
  evolutionByYear: FamiEvolutionYearPoint[];
  availableYears: number[];
  latestVersionMeta: { processingVersion: number; createdAt: string } | null;
  evolutionModeUsed: "versions" | "years";
  yearRequested: number | null;
  scopeKind?: FamiSnapshotScopeKind;
  /** Presente na visão institucional (todos os formulários da organização). */
  formBreakdown?: InstitutionalFormScore[];
};

export async function loadFamiSnapshot(params: {
  /** UUID do formulário ou `"all"` para visão institucional consolidada. */
  formId: string;
  organizationId: string;
  authRole: "admin" | "analyst" | "respondent";
  /** Fechamento FAMI daquele ano civil (BRT); omitir = ultimo processamento */
  year?: number | null;
  evolutionMode?: "versions" | "years";
}): Promise<FamiSnapshotResponse> {
  const qs = new URLSearchParams({
    formId: params.formId,
    organizationId: params.organizationId,
  });
  if (params.year != null && Number.isFinite(params.year)) {
    qs.set("year", String(params.year));
  }
  if (params.evolutionMode != null) {
    qs.set("evolutionMode", params.evolutionMode);
  }
  const res = await fetch(`/api/admin/fami/snapshot?${qs.toString()}`, {
    headers: buildAuthHeaders(params.authRole),
    credentials: "include",
  });
  const body = await parseJson<FamiSnapshotResponse & ApiError>(res);
  if (!res.ok) {
    throw new Error(body.error ?? "Falha ao carregar FAMI.");
  }
  const b = body as FamiSnapshotResponse & ApiError;
  return {
    snapshot: b.snapshot ?? null,
    evolution: b.evolution ?? [],
    evolutionByYear: b.evolutionByYear ?? [],
    availableYears: Array.isArray(b.availableYears) ? b.availableYears : [],
    latestVersionMeta: b.latestVersionMeta ?? null,
    evolutionModeUsed: b.evolutionModeUsed ?? "years",
    yearRequested: b.yearRequested ?? null,
    scopeKind: b.scopeKind,
    formBreakdown: Array.isArray(b.formBreakdown) ? b.formBreakdown : undefined,
  };
}

export { FAMI_ALL_FORMS } from "@/lib/fami/constants";
export type { InstitutionalFormScore } from "@/lib/fami/constants";

export async function reprocessFamiRequest(params: {
  formId: string;
  organizationId: string;
  authRole: "admin" | "analyst";
}): Promise<{ processingVersion: number; recommendationsCreated: number }> {
  const res = await fetch("/api/fami/reprocess", {
    method: "POST",
    headers: buildAuthHeaders(params.authRole),
    body: JSON.stringify({
      formId: params.formId,
      organizationId: params.organizationId,
    }),
  });
  const body = await parseJson<
    { processingVersion: number; recommendationsCreated: number } & ApiError
  >(res);
  if (!res.ok) {
    throw new Error(body.error ?? "Falha ao reprocessar FAMI.");
  }
  return {
    processingVersion: body.processingVersion,
    recommendationsCreated: body.recommendationsCreated,
  };
}
