import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/auth/current-user";

export type ListedUserRow = {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: AppRole;
  organizationId: string | null;
  createdAt: string;
};

export async function listUsersForAdmin(): Promise<ListedUserRow[]> {
  const client = createSupabaseServiceRoleClient();
  const { data: profiles, error } = await client
    .from("profiles")
    .select("user_id,role,organization_id,full_name,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const authList = await client.auth.admin.listUsers({ perPage: 200 });
  const emailByUserId = new Map<string, string>();
  for (const u of authList.data?.users ?? []) {
    if (u.id && u.email) emailByUserId.set(u.id, u.email);
  }

  return (profiles ?? []).map((p) => ({
    userId: p.user_id as string,
    email: emailByUserId.get(p.user_id as string) ?? null,
    fullName: (p.full_name as string | null) ?? null,
    role: p.role as AppRole,
    organizationId: (p.organization_id as string | null) ?? null,
    createdAt: String(p.created_at ?? ""),
  }));
}

const EDITABLE_ROLES = ["analyst", "respondent"] as const;

export async function updateUserProfileAdmin(input: {
  userId: string;
  fullName: string | null;
  role: AppRole;
  organizationId: string | null;
}): Promise<void> {
  const client = createSupabaseServiceRoleClient();

  const { data: target, error: fetchErr } = await client
    .from("profiles")
    .select("role")
    .eq("user_id", input.userId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;
  const targetRole = target?.role as AppRole | undefined;
  if (!targetRole) throw new Error("Usuário não encontrado.");

  if (targetRole === "admin") {
    throw new Error("Perfis de administrador não são editados aqui.");
  }

  if (input.role === "admin") {
    throw new Error("Promover a administrador não está disponível nesta tela.");
  }

  if (!EDITABLE_ROLES.includes(input.role as (typeof EDITABLE_ROLES)[number])) {
    throw new Error("Papel inválido.");
  }

  const { error } = await client
    .from("profiles")
    .update({
      full_name: input.fullName,
      role: input.role,
      organization_id: input.organizationId,
    })
    .eq("user_id", input.userId);

  if (error) throw error;
}

export async function sendPasswordResetLinkAdmin(userId: string): Promise<{
  recoveryLink: string | null;
  email: string | null;
}> {
  const client = createSupabaseServiceRoleClient();

  const { data: prof } = await client.from("profiles").select("role").eq("user_id", userId).maybeSingle();
  const role = prof?.role as AppRole | undefined;
  if (role === "admin") {
    throw new Error("Reset de administrador não está disponível nesta tela.");
  }

  const { data: u, error } = await client.auth.admin.getUserById(userId);
  if (error) throw error;
  const email = u.user?.email ?? null;
  if (!email) {
    return { recoveryLink: null, email: null };
  }

  const { data: linkData, error: linkErr } = await client.auth.admin.generateLink({
    type: "recovery",
    email,
  });
  if (linkErr) throw linkErr;

  const recoveryLink =
    (linkData.properties as { action_link?: string } | undefined)?.action_link ?? null;
  return { recoveryLink, email };
}

export async function removeUserAdmin(actorUserId: string, userId: string): Promise<void> {
  if (userId === actorUserId) {
    throw new Error("Você não pode remover a própria conta aqui.");
  }

  const client = createSupabaseServiceRoleClient();
  const { data: profile } = await client
    .from("profiles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  const targetRole = profile?.role as AppRole | undefined;
  if (!targetRole || (targetRole !== "analyst" && targetRole !== "respondent")) {
    throw new Error("Remoção permitida apenas para analistas ou respondentes.");
  }

  await client.auth.admin.deleteUser(userId);
}
