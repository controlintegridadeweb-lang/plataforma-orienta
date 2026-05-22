/**
 * Links das filas operacionais (admin / analista) com escopo opcional.
 */
export type StaffAreaPrefix = "admin" | "analista";

export type StaffQueueSegment =
  | "evidencias"
  | "recomendacoes"
  | "plano-acao"
  | "formularios"
  | "maturidade"
  | "complementacoes";

export type AdminQueuePath =
  | "/admin/evidencias"
  | "/admin/recomendacoes"
  | "/admin/plano-acao"
  | "/admin/formularios"
  | "/admin/maturidade"
  | "/admin/complementacoes";

export function staffAreaFromMode(mode: "admin" | "analyst"): StaffAreaPrefix {
  return mode === "admin" ? "admin" : "analista";
}

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
  const routeSegment = segment === "complementacoes" ? "evidencias" : segment;
  if (segment === "complementacoes" && !u.has("status")) {
    u.set("status", "complementation_requested");
  }
  const path = `/${area}/${routeSegment}`;
  const q = u.toString();
  return q ? `${path}?${q}` : path;
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

export function staffQueueHrefFromMode(
  mode: "admin" | "analyst",
  segment: StaffQueueSegment,
  opts: { globalView: boolean; organizationId: string },
  params: Record<string, string>,
): string {
  return staffQueueHref(staffAreaFromMode(mode), segment, opts, params);
}
