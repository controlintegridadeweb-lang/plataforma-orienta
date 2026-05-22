import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type {
  EvidenceFilterOptions,
  EvidenceStatsResult,
  EvidenceValidationEntry,
  EvidencesListResult,
} from "./admin-service";
import type { EvidenceExportFormat, ValidationStatus } from "./schemas";

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

export type ListEvidencesFilters = {
  formId?: string;
  organizationId?: string;
  status?: ValidationStatus;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

function appendEvidenceFilterParams(
  params: URLSearchParams,
  filters: ListEvidencesFilters,
) {
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
}

export async function listEvidences(
  filters: ListEvidencesFilters = {},
): Promise<EvidencesListResult> {
  const params = new URLSearchParams();
  appendEvidenceFilterParams(params, filters);
  const qs = params.toString();
  const res = await fetch(`/api/admin/evidences${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<EvidencesListResult & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(formatError(body));
  }
  return body as EvidencesListResult;
}

export type EvidenceStatsFilters = Pick<
  ListEvidencesFilters,
  "formId" | "organizationId" | "search" | "from" | "to"
>;

export async function getEvidenceStats(
  filters: EvidenceStatsFilters = {},
): Promise<EvidenceStatsResult> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.search) params.set("search", filters.search);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  const qs = params.toString();
  const res = await fetch(`/api/admin/evidences/stats${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<EvidenceStatsResult & ApiError>(res);
  if (!res.ok || typeof body.total !== "number") {
    throw new Error(formatError(body));
  }
  return body as EvidenceStatsResult;
}

export async function downloadEvidencesExport(
  format: EvidenceExportFormat,
  filters: ListEvidencesFilters,
  selectedIds?: string[],
): Promise<void> {
  const params = new URLSearchParams();
  params.set("format", format);
  appendEvidenceFilterParams(params, filters);
  if (selectedIds && selectedIds.length > 0) {
    params.set("ids", selectedIds.join(","));
  }
  const res = await fetch(`/api/admin/evidences/export?${params.toString()}`, {
    headers: buildHeaders({ Accept: "*/*" }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text || res.statusText || "Falha na exportacao.";
    try {
      const body = JSON.parse(text) as ApiError;
      msg = formatError(body);
    } catch {
      /* corpo nao JSON */
    }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const dispo = res.headers.get("Content-Disposition");
  let filename = `evidencias.${format}`;
  const m = /filename="([^"]+)"/.exec(dispo ?? "");
  if (m?.[1]) filename = m[1];
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function validateEvidence(
  evidenceId: string,
  payload: { status: ValidationStatus; justification?: string },
): Promise<EvidenceValidationEntry> {
  const res = await fetch(`/api/admin/evidences/${evidenceId}/validate`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ validation?: EvidenceValidationEntry } & ApiError>(res);
  if (!res.ok || !body.validation) throw new Error(formatError(body));
  return body.validation;
}

export async function loadEvidenceFilters(): Promise<EvidenceFilterOptions> {
  const res = await fetch("/api/admin/evidences/filters", {
    headers: buildHeaders(),
  });
  const body = await parseJson<EvidenceFilterOptions & ApiError>(res);
  if (!res.ok || !Array.isArray(body.forms)) throw new Error(formatError(body));
  return body as EvidenceFilterOptions;
}
