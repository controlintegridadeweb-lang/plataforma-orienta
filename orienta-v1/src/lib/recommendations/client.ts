import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type {
  RecommendationChangeEntry,
  RecommendationFilterOptions,
  RecommendationListItem,
  RecommendationRegenerateResult,
  RecommendationUpdateResult,
  RecommendationsListResult,
} from "./admin-service";
import type { RecommendationStatus } from "./schemas";
import type { SuggestedActionsPayload } from "./suggested-actions";

type ApiError = { error: string; issues?: Array<{ path: string; message: string }> };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
}

function formatError(payload: ApiError | undefined): string {
  if (!payload) return "Erro desconhecido.";
  if (payload.issues && payload.issues.length > 0) {
    return payload.issues
      .map((i) => `${i.path === "_" ? "" : `${i.path}: `}${i.message}`)
      .join(" | ");
  }
  return payload.error ?? "Erro desconhecido.";
}

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra ?? {}),
  };
  if (defaults.adminUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.adminUserId, "admin"));
  }
  return headers;
}

export type ListRecommendationsFilters = {
  formId?: string;
  organizationId?: string;
  axisId?: string;
  recommendationId?: string;
  status?: RecommendationStatus;
  type?: string;
  limit?: number;
  offset?: number;
};

export async function listRecommendations(
  filters: ListRecommendationsFilters = {},
): Promise<RecommendationsListResult> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.axisId) params.set("axisId", filters.axisId);
  if (filters.recommendationId) params.set("recommendationId", filters.recommendationId);
  if (filters.status) params.set("status", filters.status);
  if (filters.type) params.set("type", filters.type);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
  const qs = params.toString();
  const res = await fetch(`/api/admin/recommendations${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<RecommendationsListResult & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) throw new Error(formatError(body));
  return body as RecommendationsListResult;
}

export async function loadRecommendationFilters(): Promise<RecommendationFilterOptions> {
  const res = await fetch("/api/admin/recommendations/filters", {
    headers: buildHeaders(),
    credentials: "include",
  });
  const body = await parseJson<RecommendationFilterOptions & ApiError>(res);
  if (!res.ok || !Array.isArray(body.forms)) throw new Error(formatError(body));
  return body as RecommendationFilterOptions;
}

export async function updateRecommendation(
  id: string,
  payload: {
    status?: RecommendationStatus;
    currentText?: string;
    comment?: string;
  },
): Promise<RecommendationUpdateResult> {
  const res = await fetch(`/api/admin/recommendations/${id}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<RecommendationUpdateResult & ApiError>(res);
  if (!res.ok || !(body as RecommendationUpdateResult).item) {
    throw new Error(formatError(body));
  }
  return body as RecommendationUpdateResult;
}

export async function listRecommendationHistory(
  id: string,
): Promise<RecommendationChangeEntry[]> {
  const res = await fetch(`/api/admin/recommendations/${id}/history`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<{ history?: RecommendationChangeEntry[] } & ApiError>(
    res,
  );
  if (!res.ok || !Array.isArray(body.history)) throw new Error(formatError(body));
  return body.history;
}

export async function regenerateRecommendations(payload: {
  formId: string;
  organizationId: string;
}): Promise<RecommendationRegenerateResult> {
  const res = await fetch("/api/admin/recommendations/regenerate", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<RecommendationRegenerateResult & ApiError>(res);
  if (!res.ok || typeof (body as RecommendationRegenerateResult).recommendationsCreated !== "number") {
    throw new Error(formatError(body));
  }
  return body as RecommendationRegenerateResult;
}

export async function fetchRespondentSuggestedActions(
  recommendationId: string,
): Promise<SuggestedActionsPayload> {
  const res = await fetch(
    `/api/respondent/recommendations/${encodeURIComponent(recommendationId)}/suggested-actions`,
  );
  const body = await parseJson<SuggestedActionsPayload & ApiError>(res);
  if (!res.ok || !Array.isArray(body.suggestions)) {
    throw new Error(formatError(body));
  }
  return body as SuggestedActionsPayload;
}

export async function applyRespondentSuggestedActions(
  recommendationId: string,
  indices: number[],
): Promise<{ created: number; skipped: number }> {
  const res = await fetch(
    `/api/respondent/recommendations/${encodeURIComponent(recommendationId)}/apply-suggestions`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ indices }),
    },
  );
  const body = await parseJson<{ created: number; skipped: number } & ApiError>(res);
  if (!res.ok || typeof body.created !== "number") {
    throw new Error(formatError(body));
  }
  return { created: body.created, skipped: body.skipped ?? 0 };
}

export type { RecommendationListItem };
