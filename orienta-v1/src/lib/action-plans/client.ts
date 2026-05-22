import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type { ActionPlanByFormPayload } from "@/lib/domain/action-plans";
import type {
  ActionPlanAuditEntry,
  ActionPlanListItem,
  ActionPlanMetrics,
  ActionPlansListResult,
  SupervisionNoteEntry,
} from "./admin-service";
import type { ActionPlanListView, PlanStatus, SupervisionNoteType } from "./schemas";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";

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

export type ListActionPlansFilters = {
  formId?: string;
  organizationId?: string;
  recommendationId?: string;
  view?: ActionPlanListView;
  recommendationStatus?: RecommendationStatus;
  planStatus?: PlanStatus;
  responsibleContains?: string;
  search?: string;
  dueFilter?: "all" | "overdue" | "due_7d";
  limit?: number;
  offset?: number;
};

export async function listActionPlans(
  filters: ListActionPlansFilters = {},
): Promise<ActionPlansListResult> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.recommendationId) params.set("recommendationId", filters.recommendationId);
  if (filters.view) params.set("view", filters.view);
  if (filters.recommendationStatus) {
    params.set("recommendationStatus", filters.recommendationStatus);
  }
  if (filters.planStatus) params.set("planStatus", filters.planStatus);
  if (filters.responsibleContains) {
    params.set("responsibleContains", filters.responsibleContains);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.dueFilter && filters.dueFilter !== "all") {
    params.set("dueFilter", filters.dueFilter);
  }
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
  const qs = params.toString();
  const res = await fetch(`/api/admin/action-plans${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<ActionPlansListResult & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(formatError(body));
  }
  return body as ActionPlansListResult;
}

export async function loadActionPlanMetrics(filters: {
  formId?: string;
  organizationId?: string;
} = {}): Promise<ActionPlanMetrics> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  const qs = params.toString();
  const res = await fetch(`/api/admin/action-plans/metrics${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<ActionPlanMetrics & ApiError>(res);
  if (!res.ok || typeof body.totalRecommendations !== "number") {
    throw new Error(formatError(body));
  }
  return body as ActionPlanMetrics;
}

export async function fetchActionPlanByForm(
  formId: string,
  organizationId?: string,
): Promise<ActionPlanByFormPayload> {
  const params = new URLSearchParams();
  if (organizationId) params.set("organizationId", organizationId);
  const qs = params.toString();
  const res = await fetch(`/api/action-plans/by-form/${formId}${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<ActionPlanByFormPayload & ApiError>(res);
  if (!res.ok || !body.formId) {
    throw new Error(formatError(body));
  }
  return body as ActionPlanByFormPayload;
}

export async function saveActionPlan(payload: {
  planId?: string;
  recommendationId: string;
  formId: string;
  actionText: string;
  dueDate: string;
  responsibleSector: string;
  responsibleName: string;
  status: PlanStatus;
  observations?: string;
}): Promise<{ planId: string; mode: "created" | "updated" }> {
  const res = await fetch("/api/admin/action-plans/save", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ planId: string; mode: "created" | "updated" } & ApiError>(
    res,
  );
  if (!res.ok || !body.planId) throw new Error(formatError(body));
  return { planId: body.planId, mode: body.mode };
}

/** Lista planos e recomendações apenas do órgão do respondente autenticado. */
export async function listRespondentActionPlans(
  filters: ListActionPlansFilters = {},
): Promise<ActionPlansListResult> {
  const params = new URLSearchParams();
  if (filters.formId) params.set("formId", filters.formId);
  if (filters.recommendationId) params.set("recommendationId", filters.recommendationId);
  if (filters.view) params.set("view", filters.view);
  if (filters.recommendationStatus) {
    params.set("recommendationStatus", filters.recommendationStatus);
  }
  if (filters.planStatus) params.set("planStatus", filters.planStatus);
  if (filters.responsibleContains) {
    params.set("responsibleContains", filters.responsibleContains);
  }
  if (filters.search) params.set("search", filters.search);
  if (filters.dueFilter && filters.dueFilter !== "all") {
    params.set("dueFilter", filters.dueFilter);
  }
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));
  const qs = params.toString();
  const res = await fetch(`/api/respondent/action-plans${qs ? `?${qs}` : ""}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<ActionPlansListResult & ApiError>(res);
  if (!res.ok || !Array.isArray(body.items)) {
    throw new Error(formatError(body));
  }
  return body as ActionPlansListResult;
}

export async function saveRespondentActionPlan(payload: {
  planId?: string;
  recommendationId: string;
  formId: string;
  actionText: string;
  dueDate: string;
  responsibleSector: string;
  responsibleName: string;
  status: PlanStatus;
  observations?: string;
}): Promise<{ planId: string; mode: "created" | "updated" }> {
  const res = await fetch("/api/respondent/action-plans", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ planId: string; mode: "created" | "updated" } & ApiError>(
    res,
  );
  if (!res.ok || !body.planId) throw new Error(formatError(body));
  return { planId: body.planId, mode: body.mode };
}

export async function listActionPlanAudit(planId: string): Promise<ActionPlanAuditEntry[]> {
  const res = await fetch(`/api/admin/action-plans/${planId}/audit`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<{ entries: ActionPlanAuditEntry[] } & ApiError>(res);
  if (!res.ok || !Array.isArray(body.entries)) {
    throw new Error(formatError(body));
  }
  return body.entries;
}

export async function listRespondentActionPlanAudit(
  planId: string,
): Promise<ActionPlanAuditEntry[]> {
  const res = await fetch(`/api/respondent/action-plans/${planId}/audit`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<{ entries: ActionPlanAuditEntry[] } & ApiError>(res);
  if (!res.ok || !Array.isArray(body.entries)) {
    throw new Error(formatError(body));
  }
  return body.entries;
}

export async function listSupervisionNotes(
  recommendationId: string,
): Promise<SupervisionNoteEntry[]> {
  const params = new URLSearchParams({ recommendationId });
  const res = await fetch(`/api/admin/action-plans/supervision-notes?${params}`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<{ notes: SupervisionNoteEntry[] } & ApiError>(res);
  if (!res.ok || !Array.isArray(body.notes)) {
    throw new Error(formatError(body));
  }
  return body.notes;
}

export async function createSupervisionNote(payload: {
  recommendationId: string;
  noteType: SupervisionNoteType;
  body: string;
}): Promise<SupervisionNoteEntry> {
  const res = await fetch("/api/admin/action-plans/supervision-notes", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ note: SupervisionNoteEntry } & ApiError>(res);
  if (!res.ok || !body.note) throw new Error(formatError(body));
  return body.note;
}

export type { ActionPlanByFormPayload, ActionPlanListItem, ActionPlanMetrics, SupervisionNoteEntry };
