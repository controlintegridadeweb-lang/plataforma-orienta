import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type {
  RespondentEvidenceListResult,
  RespondentStatsResult,
} from "./respondent-service";
import type { RespondentEvidenceStatus } from "./respondent-status";

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

function buildHeaders(): Record<string, string> {
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Em sessao autenticada o middleware injeta o usuario; o dev header so
  // ajuda em ambientes locais sem sessao real.
  if (defaults.respondentUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.respondentUserId, "respondent"));
  }
  return headers;
}

export type RespondentEvidenceFilters = {
  formId?: string;
  search?: string;
  from?: string;
  to?: string;
  status?: RespondentEvidenceStatus;
  pendingOnly?: boolean;
  limit?: number;
  offset?: number;
};

function appendFilterParams(p: URLSearchParams, filters: RespondentEvidenceFilters) {
  if (filters.formId) p.set("formId", filters.formId);
  if (filters.search) p.set("search", filters.search);
  if (filters.from) p.set("from", filters.from);
  if (filters.to) p.set("to", filters.to);
  if (filters.status) p.set("status", filters.status);
  if (filters.pendingOnly) p.set("pendingOnly", "1");
  if (typeof filters.limit === "number") p.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") p.set("offset", String(filters.offset));
}

export async function listRespondentEvidences(
  filters: RespondentEvidenceFilters = {},
): Promise<RespondentEvidenceListResult> {
  const params = new URLSearchParams();
  appendFilterParams(params, filters);
  const qs = params.toString();
  const res = await fetch(`/api/respondent/evidences${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<RespondentEvidenceListResult & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(formatError(body));
  }
  return body as RespondentEvidenceListResult;
}

export async function getRespondentEvidenceStats(
  filters: Pick<RespondentEvidenceFilters, "formId" | "search" | "from" | "to"> = {},
): Promise<RespondentStatsResult> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  const res = await fetch(`/api/respondent/evidences/stats${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<RespondentStatsResult & ApiError>(res);
  if (!res.ok || typeof body.enviadas !== "number") {
    throw new Error(formatError(body));
  }
  return body as RespondentStatsResult;
}
