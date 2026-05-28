/**
 * Links das filas operacionais (admin) com escopo opcional.
 */
import { staffPlanoAcaoDetailHref } from "@/lib/navigation/staff-paths";

export type StaffAreaPrefix = "admin";

export type StaffQueueSegment =
  | "evidencias"
  | "recomendacoes"
  | "plano-acao"
  | "formularios"
  | "maturidade";

export type AdminQueuePath =
  | "/admin/evidencias"
  | "/admin/recomendacoes"
  | "/admin/plano-acao"
  | "/admin/formularios"
  | "/admin/maturidade";

export function staffQueueHref(
  area: StaffAreaPrefix,
  segment: StaffQueueSegment,
  opts: { globalView: boolean; organizationId: string },
  params: Record<string, string>,
): string {
  const u = new URLSearchParams();
  if (!opts.globalView && opts.organizationId) {
    u.set("organizationId", opts.organizationId);
  }
  for (const [key, value] of Object.entries(params)) {
    if (value) u.set(key, value);
  }
  const path = `/${area}/${segment}`;
  const q = u.toString();
  return q ? `${path}?${q}` : path;
}

export function adminEvidenceQueueHref(params: {
  organizationId?: string;
  formId?: string;
  status?: string;
}): string {
  const u = new URLSearchParams();
  if (params.organizationId) u.set("organizationId", params.organizationId);
  if (params.formId) u.set("formId", params.formId);
  if (params.status) u.set("status", params.status);
  const q = u.toString();
  return q ? `/admin/evidencias?${q}` : "/admin/evidencias";
}

/** Deep link para supervisão de recomendação sem plano (pendências do dashboard). */
export function adminPlanPendencyHref(recommendationId: string): string {
  return staffPlanoAcaoDetailHref("admin", recommendationId, "visao-geral");
}

/** Compat: links admin com `adminGlobalView`. */
export function adminQueueHref(
  path: AdminQueuePath,
  opts: { adminGlobalView: boolean; organizationId: string },
  params: Record<string, string>,
): string {
  const segment = path.replace(/^\/admin\//, "") as StaffQueueSegment;
  return staffQueueHref(
    "admin",
    segment,
    { globalView: opts.adminGlobalView, organizationId: opts.organizationId },
    params,
  );
}
