import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";

type ApiError = { error: string };

export type QuestionWaiverRow = {
  organizationId: string;
  questionId: string;
  reason: string | null;
  waivedBy: string;
  waivedAt: string;
};

function buildHeaders(): Record<string, string> {
  const defaults = getRuntimeDefaults();
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (defaults.adminUserId) {
    Object.assign(headers, buildDevAuthHeaders(defaults.adminUserId, "admin"));
  }
  return headers;
}

function formatError(payload: ApiError | undefined): string {
  return payload?.error ?? "Erro desconhecido.";
}

export async function listQuestionWaivers(
  organizationId: string,
): Promise<QuestionWaiverRow[]> {
  const res = await fetch(
    `/api/admin/organizations/${organizationId}/question-waivers`,
    { headers: buildHeaders() },
  );
  const body = (await res.json()) as { waivers?: QuestionWaiverRow[] } & ApiError;
  if (!res.ok) throw new Error(formatError(body));
  return body.waivers ?? [];
}

export async function setQuestionWaiver(input: {
  organizationId: string;
  questionId: string;
  reason?: string | null;
}): Promise<QuestionWaiverRow> {
  const res = await fetch(
    `/api/admin/organizations/${input.organizationId}/question-waivers`,
    {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        questionId: input.questionId,
        reason: input.reason ?? null,
      }),
    },
  );
  const body = (await res.json()) as { waiver?: QuestionWaiverRow } & ApiError;
  if (!res.ok || !body.waiver) throw new Error(formatError(body));
  return body.waiver;
}

export async function clearQuestionWaiver(input: {
  organizationId: string;
  questionId: string;
}): Promise<void> {
  const res = await fetch(
    `/api/admin/organizations/${input.organizationId}/question-waivers?questionId=${encodeURIComponent(input.questionId)}`,
    { method: "DELETE", headers: buildHeaders() },
  );
  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(formatError(body));
  }
}
