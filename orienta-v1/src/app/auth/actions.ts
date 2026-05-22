"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { resolveAppOrigin } from "@/lib/app-url";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";
import { homeRouteForRole, type AppRole } from "@/lib/auth/current-user";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { getOrganizationsForLogin } from "@/lib/organizations/login-options";

export type AuthFormState = {
  status: "idle" | "error" | "success";
  message?: string;
};

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const selectedOrganizationId = String(formData.get("organizationId") ?? "").trim();

  if (!email || !password) {
    return { status: "error", message: "Informe e-mail e senha para entrar." };
  }

  const orgCatalog = await getOrganizationsForLogin();
  if (orgCatalog.length > 0 && !selectedOrganizationId) {
    return { status: "error", message: "Selecione a organizacao." };
  }

  const supabase = await createSupabaseServerActionClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    return { status: "error", message: "E-mail ou senha invalidos." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, organization_id")
    .eq("user_id", data.user.id)
    .maybeSingle();

  const role = (profile?.role ?? null) as AppRole | null;
  if (!role) {
    await supabase.auth.signOut();
    return {
      status: "error",
      message: "Perfil nao encontrado. Contate o administrador.",
    };
  }

  if (selectedOrganizationId) {
    const profileOrg = (profile?.organization_id as string | null) ?? null;
    // Admin global (sem org no perfil) pode logar em qualquer organizacao.
    // Demais (admin com org, analyst, respondent) sao restritos a propria org.
    if (!isGlobalAdmin({ role, organizationId: profileOrg })) {
      if (!profileOrg) {
        await supabase.auth.signOut();
        return {
          status: "error",
          message: "Conta sem organizacao vinculada. Contate o administrador.",
        };
      }
      if (profileOrg !== selectedOrganizationId) {
        await supabase.auth.signOut();
        return {
          status: "error",
          message: "A conta nao corresponde a organizacao selecionada. Revise a selecao e tente de novo.",
        };
      }
    }
  }

  redirect(homeRouteForRole(role));
}

export async function requestPasswordResetAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    return { status: "error", message: "Informe seu e-mail para recuperar a senha." };
  }

  const headerStore = await headers();
  const origin = resolveAppOrigin(headerStore.get("origin"));
  const supabase = await createSupabaseServerActionClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error) {
    return { status: "error", message: "Nao foi possivel enviar o e-mail de recuperacao." };
  }

  return { status: "success", message: "Link de recuperacao enviado para seu e-mail." };
}

export async function logoutAction() {
  const supabase = await createSupabaseServerActionClient();
  await supabase.auth.signOut();
  redirect("/");
}
