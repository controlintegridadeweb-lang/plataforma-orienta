import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AppRole } from "@/lib/auth/types";

export type { AppRole };

export type AuthContext = {
  userId: string;
  role: AppRole;
  organizationId: string | null;
};

function errorResponse(message: string, status = 401) {
  return NextResponse.json({ error: message }, { status });
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

async function getProfileByUserId(
  userId: string,
): Promise<{ role: AppRole; organizationId: string | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("role,organization_id")
    .eq("user_id", userId)
    .single();

  if (error || !data?.role) return null;
  return {
    role: data.role as AppRole,
    organizationId: data.organization_id as string | null,
  };
}

async function findFirstProfileByRole(
  role: AppRole,
): Promise<{ userId: string; organizationId: string | null } | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRole) return null;

  const supabase = createClient(url, serviceRole, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, organization_id")
    .eq("role", role)
    .limit(1)
    .maybeSingle();

  if (error || !data?.user_id) return null;
  return {
    userId: data.user_id as string,
    organizationId: data.organization_id as string | null,
  };
}

export async function requireAuth(
  request: Request,
  allowedRoles: AppRole[],
): Promise<{ context: AuthContext | null; error: NextResponse | null }> {
  const devUserId = request.headers.get("x-user-id");
  const devRole = request.headers.get("x-user-role") as AppRole | null;
  if (process.env.NODE_ENV === "development" && devUserId && devRole) {
    const profile = await getProfileByUserId(devUserId);
    if (!profile) {
      return { context: null, error: errorResponse("Perfil nao encontrado.", 403) };
    }
    if (profile.role !== devRole) {
      return { context: null, error: errorResponse("Perfil divergente do usuario informado.", 403) };
    }
    if (!allowedRoles.includes(devRole)) {
      return { context: null, error: errorResponse("Perfil sem permissao.", 403) };
    }

    return {
      context: { userId: devUserId, role: devRole, organizationId: profile.organizationId },
      error: null,
    };
  }

  const token = getBearerToken(request);
  if (!token) {
    const { createSupabaseServerActionClient } = await import("@/lib/supabase/auth-server");
    const supabase = await createSupabaseServerActionClient();
    const { data: sessionUser, error: sessionError } = await supabase.auth.getUser();
    if (!sessionError && sessionUser.user) {
      const profile = await getProfileByUserId(sessionUser.user.id);
      if (!profile) {
        return { context: null, error: errorResponse("Perfil nao encontrado.", 403) };
      }
      if (!allowedRoles.includes(profile.role)) {
        return { context: null, error: errorResponse("Perfil sem permissao.", 403) };
      }
      return {
        context: {
          userId: sessionUser.user.id,
          role: profile.role,
          organizationId: profile.organizationId,
        },
        error: null,
      };
    }

    if (
      process.env.NODE_ENV === "development" &&
      process.env.ALLOW_DEV_PROFILE_FALLBACK === "1"
    ) {
      for (const role of allowedRoles) {
        const profile = await findFirstProfileByRole(role);
        if (profile) {
          return {
            context: {
              userId: profile.userId,
              role,
              organizationId: profile.organizationId,
            },
            error: null,
          };
        }
      }
      return {
        context: null,
        error: errorResponse(
          "Nenhum perfil com os papeis permitidos encontrado no banco. Crie um registro em 'profiles' com role='admin'.",
          403,
        ),
      };
    }
    return { context: null, error: errorResponse("Autenticacao obrigatoria.") };
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return { context: null, error: errorResponse("Configuracao de autenticacao ausente.", 500) };
  }

  const authClient = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await authClient.auth.getUser();
  if (error || !data.user) {
    return { context: null, error: errorResponse("Token invalido ou expirado.", 401) };
  }

  const profile = await getProfileByUserId(data.user.id);
  if (!profile) {
    return { context: null, error: errorResponse("Perfil nao encontrado.", 403) };
  }
  if (!allowedRoles.includes(profile.role)) {
    return { context: null, error: errorResponse("Perfil sem permissao.", 403) };
  }

  return {
    context: { userId: data.user.id, role: profile.role, organizationId: profile.organizationId },
    error: null,
  };
}
