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
 * `true` quando o chamador tem visão global e pode operar em qualquer
 * organização.
 *
 * Hoje: admin **sem** `organization_id` vinculada. Admins com `organization_id`
 * passam a operar como org-scoped — mesmo comportamento que `analyst` tem
 * hoje. Esta é a base da unificação `admin/analista` (Fase 1 do
 * roadmap de remoção do perfil analista): o perfil passa a ser
 * "admin com escopo configurável" em vez de dois perfis distintos.
 */
export function isGlobalAdmin(scope: CallerScope): boolean {
  return scope.role === "admin" && scope.organizationId == null;
}

/**
 * `true` quando o chamador deve operar dentro de uma única organização.
 * Inverso de `isGlobalAdmin`: cobre admin-com-org, analyst e respondent.
 */
export function isOrgScopedCaller(scope: CallerScope): boolean {
  return !isGlobalAdmin(scope);
}

/**
 * `true` quando o chamador pertence à camada operacional staff
 * (admin ou analyst — independente de ter `organization_id`).
 *
 * Use para **checagens de capacidade** (ex.: "só staff pode validar
 * evidência" / "só staff cria parecer de supervisão"). NÃO use para
 * decidir escopo de leitura/escrita de dados — para isso prefira
 * `isGlobalAdmin` / `isOrgScopedCaller`.
 *
 * @deprecated Será simplificado para `scope.role === "admin"` quando o
 * perfil `analyst` for removido (Fase 3 do roadmap).
 */
export function isStaffCaller(scope: CallerScope): boolean {
  return scope.role === "admin" || scope.role === "analyst";
}
