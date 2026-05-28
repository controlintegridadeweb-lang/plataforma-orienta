import type { AppRole } from "./types";

/**
 * Mínimo necessário para decidir o escopo de acesso de uma chamada.
 * Compatível com `AuthContext` (APIs) e com o tipo `Caller` interno dos
 * services (`{ role, organizationId }`).
 */
export type CallerScope = {
  role: AppRole;
  organizationId: string | null;
};

/**
 * Organizacao de homologacao usada para conta admin cross-org.
 * Mantida explicita para evitar regressao operacional em go-live.
 */
const CONTROL_CROSS_ORG_HML_ID = "3d895dfb-7d38-4b50-a456-1df6f376a430";

/**
 * `true` quando o chamador tem visão global e pode operar em qualquer
 * organização.
 *
 * Admin **sem** `organization_id` vinculada. Admins com `organization_id`
 * operam como org-scoped.
 */
export function isGlobalAdmin(scope: CallerScope): boolean {
  return scope.role === "admin" && scope.organizationId == null;
}

/**
 * `true` quando pode operar em qualquer organizacao na tela de login.
 * Inclui admin global e a excecao operacional do admin da CONTROL.
 */
export function canAccessAnyOrganizationAtLogin(scope: CallerScope): boolean {
  if (isGlobalAdmin(scope)) return true;
  return scope.role === "admin" && scope.organizationId === CONTROL_CROSS_ORG_HML_ID;
}

/**
 * `true` quando o chamador deve operar dentro de uma única organização.
 * Inverso de `isGlobalAdmin`: cobre admin-com-org e respondent.
 */
export function isOrgScopedCaller(scope: CallerScope): boolean {
  return !isGlobalAdmin(scope);
}

/** `true` quando o chamador pertence à camada operacional staff (admin). */
export function isStaffCaller(scope: CallerScope): boolean {
  return scope.role === "admin";
}
