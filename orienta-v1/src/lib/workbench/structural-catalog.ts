import type { SupabaseClient } from "@supabase/supabase-js";

/** Eixos estruturais FAMI (`public.axes`). Devem existir para mapear biblioteca → FAMI/recomendações. */
export const STRUCTURAL_AXIS_NAMES = ["Governanca", "Ambiental", "Social"] as const;

/**
 * Garante o catálogo mínimo em `axes` após resets que truncam `axes`/`sections`
 * mas mantêm perguntas e vínculos da Biblioteca.
 */
export async function ensureStructuralAxesCatalog(supabase: SupabaseClient): Promise<void> {
  const { error } = await supabase
    .from("axes")
    .upsert(
      STRUCTURAL_AXIS_NAMES.map((name) => ({ name })),
      { onConflict: "name" },
    );
  if (error) throw error;
}
