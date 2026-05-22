import { buildDevAuthHeaders, getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import type {
  LibraryCatalogEntity,
  LibraryCatalogItem,
  LibraryCatalogSnapshot,
} from "./types";
import type { QuestionLibraryBinding } from "./binding-types";

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
      .map((issue) => `${issue.path === "_" ? "" : `${issue.path}: `}${issue.message}`)
      .join(" | ");
  }
  return payload.error ?? "Erro desconhecido.";
}

export async function fetchLibraryCatalog(): Promise<LibraryCatalogSnapshot> {
  const response = await fetch("/api/admin/library/catalog", {
    headers: buildLibraryHeaders(),
  });
  const body = await parseJson<LibraryCatalogSnapshot & ApiError>(response);
  if (
    !response.ok ||
    !Array.isArray(body.axes) ||
    !Array.isArray(body.sections) ||
    !Array.isArray(body.recommendations) ||
    !Array.isArray(body.actions)
  ) {
    throw new Error(formatError(body as ApiError));
  }
  return body as LibraryCatalogSnapshot;
}

function buildLibraryHeaders(extra?: Record<string, string>): Record<string, string> {
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

export async function createLibraryItem(
  entity: LibraryCatalogEntity,
  payload: Record<string, unknown>,
): Promise<LibraryCatalogItem> {
  const response = await fetch(`/api/admin/library/${entity}`, {
    method: "POST",
    headers: buildLibraryHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ item?: LibraryCatalogItem } & ApiError>(response);
  if (!response.ok || !body.item) throw new Error(formatError(body));
  return body.item;
}

export async function updateLibraryItem(
  entity: LibraryCatalogEntity,
  id: string,
  payload: Record<string, unknown>,
): Promise<LibraryCatalogItem> {
  const response = await fetch(`/api/admin/library/${entity}/${id}`, {
    method: "PUT",
    headers: buildLibraryHeaders(),
    body: JSON.stringify(payload),
  });
  const body = await parseJson<{ item?: LibraryCatalogItem } & ApiError>(response);
  if (!response.ok || !body.item) throw new Error(formatError(body));
  return body.item;
}

export async function deleteLibraryItem(entity: LibraryCatalogEntity, id: string): Promise<void> {
  const response = await fetch(`/api/admin/library/${entity}/${id}`, {
    method: "DELETE",
    headers: buildLibraryHeaders(),
  });
  if (!response.ok) {
    const body = await parseJson<ApiError>(response);
    throw new Error(formatError(body));
  }
}

export type LibraryTransition =
  | "submit_for_review"
  | "return_review"
  | "publish"
  | "deprecate"
  | "archive";

export async function transitionLibraryItem(
  entity: LibraryCatalogEntity,
  id: string,
  action: LibraryTransition,
  payload: { justification?: string | null; reviewerUserId?: string | null } = {},
): Promise<LibraryCatalogItem> {
  const response = await fetch(`/api/admin/library/${entity}/${id}/transitions`, {
    method: "POST",
    headers: buildLibraryHeaders(),
    body: JSON.stringify({ action, ...payload }),
  });
  const body = await parseJson<{ item?: LibraryCatalogItem } & ApiError>(response);
  if (!response.ok || !body.item) throw new Error(formatError(body));
  return body.item;
}

export async function fetchLibraryItemVersions(
  entity: LibraryCatalogEntity,
  id: string,
): Promise<Array<{
  id: string;
  version: string;
  publishedAt: string;
  vigenteDe: string;
  vigenteAte: string | null;
  hash: string;
}>> {
  const response = await fetch(`/api/admin/library/${entity}/${id}/versions`, {
    headers: buildLibraryHeaders(),
  });
  const body = await parseJson<
    {
      versions?: Array<{
        id: string;
        version: string;
        publishedAt: string;
        vigenteDe: string;
        vigenteAte: string | null;
        hash: string;
      }>;
    } & ApiError
  >(response);
  if (!response.ok || !body.versions) throw new Error(formatError(body));
  return body.versions;
}

export async function fetchQuestionBinding(
  formId: string,
  questionId: string,
): Promise<QuestionLibraryBinding | null> {
  const response = await fetch(
    `/api/admin/forms/${formId}/questions/${questionId}/binding`,
    { headers: buildLibraryHeaders({ Accept: "application/json" }) },
  );
  const body = await parseJson<{ binding?: QuestionLibraryBinding | null } & ApiError>(response);
  if (!response.ok) throw new Error(formatError(body));
  return body.binding ?? null;
}

export async function saveQuestionBinding(
  formId: string,
  questionId: string,
  payload: Record<string, unknown>,
): Promise<QuestionLibraryBinding> {
  const response = await fetch(
    `/api/admin/forms/${formId}/questions/${questionId}/binding`,
    {
      method: "PUT",
      headers: buildLibraryHeaders(),
      body: JSON.stringify(payload),
    },
  );
  const body = await parseJson<{ binding?: QuestionLibraryBinding } & ApiError>(response);
  if (!response.ok || !body.binding) throw new Error(formatError(body));
  return body.binding;
}
