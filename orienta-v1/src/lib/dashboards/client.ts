import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type { AxisMaturity } from "@/lib/fami/types";
import type { RespondentProgress } from "@/lib/dashboards/queries";

type ApiError = { error: string };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
}

export type DashboardMaturityResponse = {
  items: AxisMaturity[];
  scope: "global" | "organization";
  organizationId: string | null;
  snapshotYearApplied: number | null;
  availableYears: number[];
  /** Score FAMI global do par (form, org) — null para escopo agregado. */
  globalPercentage: number | null;
  formId: string | null;
  formName: string | null;
  formState: string | null;
  isOfficialScore: boolean;
  applicableQuestions: number;
  waivedQuestions: number;
  reprocessedAt: string | null;
};

export async function fetchDashboardMaturityByAxis(
  organizationId: string | null,
  options?: { year?: number | null },
): Promise<DashboardMaturityResponse> {
  const params = new URLSearchParams();
  if (organizationId) params.set("organizationId", organizationId);
  if (options?.year != null && Number.isFinite(options.year)) {
    params.set("year", String(options.year));
  }
  const qs = params.toString();
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = {};
  if (defaults.adminUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.adminUserId, "admin"));
  }
  const res = await fetch(
    `/api/admin/dashboard/maturity-by-axis${qs ? `?${qs}` : ""}`,
    { headers },
  );
  const body = await parseJson<DashboardMaturityResponse & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(body.error ?? "Falha ao carregar maturidade.");
  }
  const b = body as DashboardMaturityResponse & ApiError;
  return {
    items: b.items,
    scope: b.scope ?? (organizationId ? "organization" : "global"),
    organizationId: b.organizationId ?? (organizationId ?? null),
    snapshotYearApplied: b.snapshotYearApplied ?? null,
    availableYears: Array.isArray(b.availableYears) ? b.availableYears : [],
    globalPercentage: typeof b.globalPercentage === "number" ? b.globalPercentage : null,
    formId: b.formId ?? null,
    formName: b.formName ?? null,
    formState: b.formState ?? null,
    isOfficialScore: Boolean(b.isOfficialScore),
    applicableQuestions: Number(b.applicableQuestions ?? 0),
    waivedQuestions: Number(b.waivedQuestions ?? 0),
    reprocessedAt: b.reprocessedAt ?? null,
  };
}

export type DashboardEvidenceStatusResponse = {
  data: Record<string, number>;
  scope: "global" | "organization";
  organizationId: string | null;
};

export async function fetchDashboardEvidenceStatus(
  organizationId: string | null,
): Promise<DashboardEvidenceStatusResponse> {
  const qs = organizationId
    ? new URLSearchParams({ organizationId }).toString()
    : "";
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = {};
  if (defaults.adminUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.adminUserId, "admin"));
  }
  const res = await fetch(
    `/api/admin/dashboard/evidence-status${qs ? `?${qs}` : ""}`,
    { headers },
  );
  const body = await parseJson<DashboardEvidenceStatusResponse & ApiError>(res);
  if (!res.ok || !body.data || typeof body.data !== "object") {
    throw new Error(body.error ?? "Falha ao carregar status das evidencias.");
  }
  return body as DashboardEvidenceStatusResponse;
}

export type RespondentFormsProgressResponse = {
  items: RespondentProgress[];
  year: number;
};

export async function fetchRespondentFormsProgress(
  year: number,
): Promise<RespondentFormsProgressResponse> {
  const params = new URLSearchParams({ year: String(year) });
  const res = await fetch(`/api/respondent/dashboard/forms-progress?${params}`, {
    cache: "no-store",
  });
  const body = await parseJson<RespondentFormsProgressResponse & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(body.error ?? "Falha ao carregar formularios.");
  }
  return {
    items: body.items,
    year: body.year,
  };
}
