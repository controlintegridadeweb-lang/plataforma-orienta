/**
 * Contrato canônico: dados de perfil no Supabase (`profiles` + `organizations`
 * anexa via FK), expostos na sessão (CurrentUser) e em APIs.
 *
 * - Identidade: `user_id` (auth.users) + email do Auth.
 * - Papel/tenant: `role`, `organization_id`.
 * - Dados pessoais: `full_name` (texto, opcional).
 * - Preferências: `preferences` (JSON, defaults em UI se chave inexistente).
 */
export type ProfilePreferences = Record<string, unknown>;

export const defaultProfilePreferences: ProfilePreferences = {};

/** Nome exibido: perfil, senão email formatado, senão fallback. */
export function displayNameFromProfile(
  fullName: string | null,
  email: string | null,
): string {
  const fromProfile = fullName?.trim();
  if (fromProfile) return fromProfile;
  if (!email) return "Usuario";
  const local = email.split("@")[0] ?? email;
  return local.replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Checklist de validação manual pós-implantação (blocos do perfil do respondente):
 * - Pessoal: `full_name` e email coerentes no shell; PATCH em `/api/respondent/profile` persiste.
 * - Organização: nome da org no perfil; sem org → mensagem clara nas telas.
 * - Formulários: salvar resposta cria/altera `responses` com `created_by = auth.uid()`.
 * - Evidências/complementações: listagem filtrada por `organization_id` do perfil.
 * - Progresso: dashboard bate com contagens reais (responses no form).
 * - Preferências: JSON no perfil; UI relevante aplica.
 */
export const RESPONDENT_PROFILE_VALIDATION_STEPS = [
  "pessoal: nome, email, preferencias",
  "organizacao: nome e id",
  "formularios: workbench com sessao e autoria",
  "evidencias e complementacoes: escopo",
  "progresso: KPIs e barras",
] as const;
