import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type { FormSummary, QuestionRow } from "./admin-service";

type ApiError = { error: string; issues?: Array<{ path: string; message: string }> };

export type FormPublishPending = {
  questionId: string;
  missing: string[];
};

export class FormPublishPendingError extends Error {
  pending: FormPublishPending[];
  constructor(message: string, pending: FormPublishPending[]) {
    super(message);
    this.name = "FormPublishPendingError";
    this.pending = pending;
  }
}

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
      .map((issue) => `${issue.path === "_" ? "" : `${issue.path}: `}${issue.message}`)
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

// -- Formularios ----------------------------------------------------------

export async function listForms(options: { includeArchived?: boolean } = {}): Promise<FormSummary[]> {
  const qs = options.includeArchived ? "?includeArchived=true" : "";
  const res = await fetch(`/api/admin/forms${qs}`, { headers: buildHeaders() });
  const body = await parseJson<{ forms?: FormSummary[] } & ApiError>(res);
  if (!res.ok || !body.forms) throw new Error(formatError(body));
  return body.forms;
}

export async function createForm(payload: { name: string }): Promise<FormSummary> {
  const res = await fetch("/api/admin/forms", {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ form?: FormSummary } & ApiError>(res);
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return body.form;
}

export async function getForm(formId: string): Promise<FormSummary> {
  const res = await fetch(`/api/admin/forms/${formId}`, { headers: buildHeaders() });
  const body = await parseJson<{ form?: FormSummary } & ApiError>(res);
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return body.form;
}

export async function renameForm(formId: string, name: string): Promise<FormSummary> {
  const res = await fetch(`/api/admin/forms/${formId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ name }),
  });
  const body = await parseJson<{ form?: FormSummary } & ApiError>(res);
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return body.form;
}

export async function setFormArchived(formId: string, archived: boolean): Promise<FormSummary> {
  const res = await fetch(`/api/admin/forms/${formId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ archived }),
  });
  const body = await parseJson<{ form?: FormSummary } & ApiError>(res);
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return body.form;
}

export async function setFormDeadline(
  formId: string,
  responseDeadlineAt: string | null,
): Promise<FormSummary> {
  const res = await fetch(`/api/admin/forms/${formId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ responseDeadlineAt }),
  });
  const body = await parseJson<{ form?: FormSummary } & ApiError>(res);
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return body.form;
}

export type FormCloseResult = {
  form: { id: string; state: string; closedAt: string };
  famiReprocess: { processed: number; failed: number };
};

export async function closeForm(formId: string): Promise<FormCloseResult> {
  const res = await fetch(`/api/admin/forms/${formId}/close`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({ confirm: true }),
  });
  const body = await parseJson<FormCloseResult & ApiError>(res);
  if (!res.ok) throw new Error(formatError(body));
  return body;
}

export type FormReopenResult = {
  form: { id: string; state: string; closedAt: string | null };
  message: string;
};

export async function reopenForm(formId: string): Promise<FormReopenResult> {
  const res = await fetch(`/api/admin/forms/${formId}/reopen`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({}),
  });
  const body = await parseJson<FormReopenResult & ApiError>(res);
  if (!res.ok) throw new Error(formatError(body));
  return body;
}

export async function deleteForm(formId: string): Promise<void> {
  const res = await fetch(`/api/admin/forms/${formId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  const body = await parseJson<{ ok?: boolean } & ApiError>(res);
  if (!res.ok) throw new Error(formatError(body));
}

export async function publishForm(
  formId: string,
  action?: "publish" | "approve",
): Promise<FormSummary> {
  const res = await fetch(`/api/admin/forms/${formId}/publish`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(action ? { action } : {}),
  });
  const body = await parseJson<
    { form?: Partial<FormSummary>; pending?: FormPublishPending[] } & ApiError
  >(res);
  if (res.status === 409 && Array.isArray(body.pending) && body.pending.length > 0) {
    throw new FormPublishPendingError(body.error ?? "Binding incompleto.", body.pending);
  }
  if (!res.ok || !body.form) throw new Error(formatError(body));
  return {
    id: String(body.form.id),
    name: String(body.form.name),
    version: Number(body.form.version),
    state: String(body.form.state),
    archivedAt: (body.form.archivedAt as string | null | undefined) ?? null,
    createdAt: String(body.form.createdAt),
    questionCount: Number(body.form.questionCount ?? 0),
    responseDeadlineAt:
      (body.form.responseDeadlineAt as string | null | undefined) ?? null,
    closedAt: (body.form.closedAt as string | null | undefined) ?? null,
  };
}

// -- Perguntas ------------------------------------------------------------

export async function listFormQuestions(formId: string): Promise<QuestionRow[]> {
  const res = await fetch(`/api/admin/forms/${formId}/questions`, {
    headers: buildHeaders(),
  });
  const body = await parseJson<{ questions?: QuestionRow[] } & ApiError>(res);
  if (!res.ok || !body.questions) throw new Error(formatError(body));
  return body.questions;
}

export async function createFormQuestion(
  formId: string,
  payload: { prompt: string; requiresEvidence: boolean },
): Promise<QuestionRow> {
  const res = await fetch(`/api/admin/forms/${formId}/questions`, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ question?: QuestionRow } & ApiError>(res);
  if (!res.ok || !body.question) throw new Error(formatError(body));
  return body.question;
}

export async function updateFormQuestion(
  formId: string,
  questionId: string,
  payload: { prompt?: string; requiresEvidence?: boolean },
): Promise<QuestionRow> {
  const res = await fetch(`/api/admin/forms/${formId}/questions/${questionId}`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ question?: QuestionRow } & ApiError>(res);
  if (!res.ok || !body.question) throw new Error(formatError(body));
  return body.question;
}

export async function removeFormQuestion(formId: string, questionId: string): Promise<void> {
  const res = await fetch(`/api/admin/forms/${formId}/questions/${questionId}`, {
    method: "DELETE",
    headers: buildHeaders(),
  });
  const body = await parseJson<{ ok?: boolean } & ApiError>(res);
  if (!res.ok) throw new Error(formatError(body));
}

export async function reorderFormQuestions(
  formId: string,
  orderedQuestionIds: string[],
): Promise<QuestionRow[]> {
  const res = await fetch(`/api/admin/forms/${formId}/questions/reorder`, {
    method: "PATCH",
    headers: buildHeaders(),
    body: JSON.stringify({ orderedQuestionIds }),
  });
  const body = await parseJson<{ questions?: QuestionRow[] } & ApiError>(res);
  if (!res.ok || !body.questions) throw new Error(formatError(body));
  return body.questions;
}
