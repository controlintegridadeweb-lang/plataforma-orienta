import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerActionClient } from "@/lib/supabase/auth-server";
import { requireAuth } from "@/lib/api/auth";
import { logError } from "@/lib/observability/logger";

const patchSchema = z.object({
  fullName: z.string().max(500).optional(),
  preferences: z.record(z.string(), z.unknown()).optional(),
});

/**
 * Atualiza nome e preferencias do proprio perfil (sessao; RLS e trigger em `profiles`).
 */
export async function PATCH(request: Request) {
  const { context, error: authError } = await requireAuth(request, ["respondent", "analyst", "admin"]);
  if (authError) return authError;

  const body = await request.json().catch(() => ({}));
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: { full_name?: string | null; preferences?: Record<string, unknown> } = {};
  if (parsed.data.fullName !== undefined) {
    const t = parsed.data.fullName.trim();
    updates.full_name = t.length > 0 ? t : null;
  }
  if (parsed.data.preferences !== undefined) {
    updates.preferences = parsed.data.preferences;
  }
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "Nenhum campo para atualizar." }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerActionClient();
    const { data, error: updateError } = await supabase
      .from("profiles")
      .update(updates)
      .eq("user_id", context!.userId)
      .select("full_name, preferences")
      .single();
    if (updateError) throw updateError;

    const rawPrefs = data?.preferences;
    const preferences =
      rawPrefs && typeof rawPrefs === "object" && !Array.isArray(rawPrefs)
        ? (rawPrefs as Record<string, unknown>)
        : {};

    return NextResponse.json({
      ok: true,
      profile: {
        fullName: (data?.full_name as string | null) ?? null,
        preferences,
      },
    });
  } catch (error) {
    logError("Failed to update profile", error, { route: "/api/respondent/profile" });
    const message = error instanceof Error ? error.message : "Falha ao atualizar perfil.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
