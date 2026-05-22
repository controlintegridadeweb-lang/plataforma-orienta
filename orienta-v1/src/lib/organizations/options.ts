import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type OrganizationOption = { id: string; name: string };

/**
 * Lista todas as organizações para selects administrativos (service role).
 */
export async function getOrganizationOptions(): Promise<OrganizationOption[]> {
  try {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });
    if (error || !data?.length) return [];
    return data.map((r) => ({ id: r.id as string, name: r.name as string }));
  } catch {
    return [];
  }
}
