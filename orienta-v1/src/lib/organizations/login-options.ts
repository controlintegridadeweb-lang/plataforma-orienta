import type { OrganizationOption } from "./options";
import { getOrganizationOptions } from "./options";

export type LoginOrganizationOption = OrganizationOption;

/**
 * Nomes/ids para a tela de login (apenas leitura no servidor).
 * Sem service role ou em falha, retorna lista vazia e o login segue sem seletor.
 */
export async function getOrganizationsForLogin(): Promise<LoginOrganizationOption[]> {
  return getOrganizationOptions();
}
