import { redirect } from "next/navigation";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";
import { displayNameFromProfile, type ProfilePreferences } from "@/lib/auth/profile-types";
import { logError } from "@/lib/observability/logger";
import type { AppRole } from "@/lib/auth/types";

export type { AppRole };

export type CurrentUser = {
  userId: string;
  email: string | null;
  role: AppRole;
  organizationId: string | null;
  fullName: string | null;
  organizationName: string | null;
  preferences: ProfilePreferences;
};

function organizationNameFromProfile(profile: {
  organizations?: { name: string } | { name: string }[] | null;
}): string | null {
  const o = profile.organizations;
  if (Array.isArray(o)) return o[0]?.name ?? null;
  return o?.name ?? null;
}

export function getCurrentUserDisplayName(user: CurrentUser): string {
  return displayNameFromProfile(user.fullName, user.email);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createSupabaseServerActionClient();
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError || !authData.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, organization_id, full_name, preferences, organizations(name)")
    .eq("user_id", authData.user.id)
    .maybeSingle();

  if (profileError) {
    logError("Failed to load profile for current user", profileError, {
      userId: authData.user.id,
      where: "getCurrentUser",
    });
    return null;
  }
  if (!profile?.role) return null;

  const rawPrefs = profile.preferences;
  const preferences: ProfilePreferences =
    rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)
      ? (rawPrefs as ProfilePreferences)
      : {};

  return {
    userId: authData.user.id,
    email: authData.user.email ?? null,
    role: profile.role as AppRole,
    organizationId: (profile.organization_id as string | null) ?? null,
    fullName: (profile.full_name as string | null) ?? null,
    organizationName: organizationNameFromProfile(
      profile as { organizations?: { name: string } | { name: string }[] | null },
    ),
    preferences,
  };
}

export function homeRouteForRole(role: AppRole): string {
  if (role === "admin") return "/admin";
  if (role === "analyst") return "/analista";
  return "/respondente";
}

export async function requireRole(allowed: AppRole[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!allowed.includes(user.role)) redirect(homeRouteForRole(user.role));
  return user;
}
