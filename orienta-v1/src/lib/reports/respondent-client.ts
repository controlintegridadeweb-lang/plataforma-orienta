import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type { RespondentReportHistoryRow } from "./respondent-presentation";

type ApiError = { error: string };

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as T) : ({} as T);
  } catch {
    throw new Error("Resposta invalida do servidor.");
  }
}

function respondentHeaders(): Record<string, string> {
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = {};
  if (defaults.respondentUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.respondentUserId, "respondent"));
  }
  return headers;
}

export async function listRespondentReports(): Promise<{
  viewerUserId: string;
  items: RespondentReportHistoryRow[];
}> {
  const res = await fetch("/api/respondent/reports", {
    credentials: "include",
    headers: respondentHeaders(),
  });
  const body = await parseJson<{ viewerUserId?: string; items?: RespondentReportHistoryRow[] } & ApiError>(
    res,
  );
  if (!res.ok || !Array.isArray(body.items) || typeof body.viewerUserId !== "string") {
    throw new Error(typeof body.error === "string" ? body.error : "Falha ao carregar historico.");
  }
  return { viewerUserId: body.viewerUserId, items: body.items };
}

export async function deleteRespondentReport(id: string): Promise<void> {
  const res = await fetch(`/api/respondent/reports/${id}`, {
    method: "DELETE",
    credentials: "include",
    headers: respondentHeaders(),
  });
  const body = await parseJson<ApiError & { ok?: boolean }>(res);
  if (!res.ok || !body.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Falha ao remover registro.");
  }
}

export async function loadProcessingVersions(
  organizationId: string,
  formId: string,
): Promise<number[]> {
  const qs = new URLSearchParams({ organizationId, formId });
  const res = await fetch(`/api/reports/processing-versions?${qs}`, {
    credentials: "include",
    headers: respondentHeaders(),
  });
  const body = await parseJson<{ versions?: number[] } & ApiError>(res);
  if (!res.ok || !Array.isArray(body.versions)) {
    throw new Error(typeof body.error === "string" ? body.error : "Falha ao carregar versoes.");
  }
  return body.versions;
}
