import { buildDevAuthHeaders } from "./runtime-defaults";

/**
 * Rotas `/api/dev/workbench-*` respondem 403 fora de desenvolvimento (`assertDevOnly`).
 * Em build de produção, força sempre o fluxo com cookie (`/api/workbench/*`, etc.).
 */
function sessionBacked(useSessionContext: boolean): boolean {
  return useSessionContext || process.env.NODE_ENV === "production";
}

type WorkbenchIdentifiers = {
  formId: string;
  organizationId: string;
  respondentUserId: string;
  analystUserId: string;
};

const WORKBENCH_PROD_PREFIX = "/api/workbench";
const WORKBENCH_DEV_PREFIX = "/api/dev";

function sessionInit(method: string, body?: object): RequestInit {
  return {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  };
}

export async function fetchWorkbenchData(
  ids: WorkbenchIdentifiers,
  role: "analyst" | "respondent",
  useSessionContext: boolean,
) {
  const withSession = sessionBacked(useSessionContext);
  const authUserId = role === "respondent" ? ids.respondentUserId : ids.analystUserId;
  const orgParam = new URLSearchParams({ formId: ids.formId, organizationId: ids.organizationId });
  const url = withSession
    ? `${WORKBENCH_PROD_PREFIX}/data?${orgParam.toString()}`
    : `${WORKBENCH_DEV_PREFIX}/workbench-data?${orgParam.toString()}`;
  return withSession
    ? fetch(url, sessionInit("GET"))
    : fetch(url, { headers: buildDevAuthHeaders(authUserId, role) });
}

export type WorkbenchEvidencePayload = {
  kind: "file" | "link";
  title: string;
  description?: string;
  storagePath?: string;
  externalLink?: string;
};

export async function submitWorkbenchResponse(
  ids: WorkbenchIdentifiers,
  payload: {
    questionId: string;
    answer: "yes" | "no" | "partial";
    notes: string;
    evidence?: WorkbenchEvidencePayload;
    isNotApplicable?: boolean;
  },
  useSessionContext: boolean,
) {
  const withSession = sessionBacked(useSessionContext);
  const body: Record<string, unknown> = {
    formId: ids.formId,
    organizationId: ids.organizationId,
    questionId: payload.questionId,
    answer: payload.answer,
    notes: payload.notes,
  };
  if (payload.evidence) body.evidence = payload.evidence;
  if (payload.isNotApplicable !== undefined) {
    body.isNotApplicable = payload.isNotApplicable;
  }

  if (withSession) {
    return fetch(`${WORKBENCH_PROD_PREFIX}/response`, sessionInit("POST", body as object));
  }
  return fetch("/api/dev/workbench-save-response", {
    method: "POST",
    headers: buildDevAuthHeaders(ids.respondentUserId, "respondent"),
    body: JSON.stringify({
      formId: ids.formId,
      organizationId: ids.organizationId,
      questionId: payload.questionId,
      respondentUserId: ids.respondentUserId,
      answer: payload.answer,
      notes: payload.notes,
      evidence: payload.evidence,
      isNotApplicable: payload.isNotApplicable,
    }),
  });
}

export async function removeEvidenceAttachment(
  ids: WorkbenchIdentifiers,
  payload: { questionId: string; draftStoragePath?: string | null },
  useSessionContext: boolean,
) {
  const withSession = sessionBacked(useSessionContext);
  const body: Record<string, unknown> = {
    formId: ids.formId,
    organizationId: ids.organizationId,
    questionId: payload.questionId,
  };
  if (payload.draftStoragePath) {
    body.draftStoragePath = payload.draftStoragePath;
  }

  if (withSession) {
    return fetch(`${WORKBENCH_PROD_PREFIX}/evidence/remove`, sessionInit("POST", body as object));
  }
  return fetch("/api/dev/workbench-remove-evidence", {
    method: "POST",
    headers: buildDevAuthHeaders(ids.respondentUserId, "respondent"),
    body: JSON.stringify({ ...body, respondentUserId: ids.respondentUserId }),
  });
}

export async function uploadEvidenceFile(
  ids: WorkbenchIdentifiers,
  file: File,
  useSessionContext: boolean,
) {
  const withSession = sessionBacked(useSessionContext);
  const fd = new FormData();
  fd.append("file", file);
  fd.append("formId", ids.formId);
  fd.append("organizationId", ids.organizationId);
  if (withSession) {
    return fetch(`${WORKBENCH_PROD_PREFIX}/evidence/upload`, {
      method: "POST",
      body: fd,
      credentials: "include",
    });
  }
  return fetch(`${WORKBENCH_PROD_PREFIX}/evidence/upload`, {
    method: "POST",
    body: fd,
    headers: buildDevAuthHeaders(ids.respondentUserId, "respondent"),
  });
}

export async function submitEvidenceValidation(
  ids: WorkbenchIdentifiers,
  payload: { responseId: string; status: "valid" | "invalid" | "complementation_requested" },
  useSessionContext: boolean,
) {
  const withSession = sessionBacked(useSessionContext);
  if (withSession) {
    return fetch(
      `${WORKBENCH_PROD_PREFIX}/validate-evidence`,
      sessionInit("POST", { responseId: payload.responseId, status: payload.status }),
    );
  }
  return fetch("/api/dev/workbench-validate-evidence", {
    method: "POST",
    headers: buildDevAuthHeaders(ids.analystUserId, "analyst"),
    body: JSON.stringify({
      responseId: payload.responseId,
      analystUserId: ids.analystUserId,
      status: payload.status,
    }),
  });
}

export async function reprocessFami(ids: WorkbenchIdentifiers, useSessionContext: boolean) {
  if (sessionBacked(useSessionContext)) {
    return fetch(
      "/api/fami/reprocess",
      sessionInit("POST", { formId: ids.formId, organizationId: ids.organizationId }),
    );
  }
  return fetch("/api/fami/reprocess", {
    method: "POST",
    headers: buildDevAuthHeaders(ids.analystUserId, "analyst"),
    body: JSON.stringify({ formId: ids.formId, organizationId: ids.organizationId }),
  });
}

/**
 * Envia o formulario do respondente: dispara o reprocessamento (FAMI +
 * recomendacoes por cenario) para a propria organizacao do usuario logado.
 * A organizacao e derivada no servidor (perfil), nao do cliente.
 */
export async function submitRespondentForm(
  ids: WorkbenchIdentifiers,
  useSessionContext: boolean,
) {
  if (sessionBacked(useSessionContext)) {
    return fetch(
      "/api/respondent/forms/submit",
      sessionInit("POST", { formId: ids.formId }),
    );
  }
  return fetch("/api/respondent/forms/submit", {
    method: "POST",
    headers: buildDevAuthHeaders(ids.respondentUserId, "respondent"),
    body: JSON.stringify({ formId: ids.formId }),
  });
}
