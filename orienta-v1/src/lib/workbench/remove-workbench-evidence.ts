import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "evidencias";

export type RemoveWorkbenchEvidenceInput = {
  organizationId: string;
  formId: string;
  questionId: string;
  /** Arquivo só no storage (upload antes de salvar a resposta). */
  draftStoragePath?: string | null;
};

export async function removeWorkbenchEvidence(
  supabase: SupabaseClient,
  input: RemoveWorkbenchEvidenceInput,
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { organizationId, formId, questionId } = input;
  const prefix = `${organizationId}/${formId}/`;

  const { data: responseRow, error: respErr } = await supabase
    .from("responses")
    .select("id")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (respErr) throw respErr;

  if (responseRow?.id) {
    const { data: ev, error: evErr } = await supabase
      .from("evidences")
      .select("id, storage_path")
      .eq("response_id", responseRow.id)
      .maybeSingle();
    if (evErr) throw evErr;

    if (ev) {
      const path = ev.storage_path as string | null;
      if (path) {
        const { error: remErr } = await supabase.storage.from(BUCKET).remove([path]);
        if (remErr) {
          return { ok: false, status: 502, error: remErr.message || "Falha ao remover arquivo no storage." };
        }
      }
      const { error: delErr } = await supabase.from("evidences").delete().eq("id", ev.id);
      if (delErr) throw delErr;
      return { ok: true };
    }
  }

  const draftPath = input.draftStoragePath?.trim();
  if (draftPath) {
    if (!draftPath.startsWith(prefix)) {
      return { ok: false, status: 400, error: "Caminho de arquivo invalido." };
    }
    const { error: remErr } = await supabase.storage.from(BUCKET).remove([draftPath]);
    if (remErr) {
      return { ok: false, status: 502, error: remErr.message || "Falha ao remover arquivo no storage." };
    }
    return { ok: true };
  }

  return { ok: false, status: 404, error: "Nenhuma evidencia para remover." };
}
