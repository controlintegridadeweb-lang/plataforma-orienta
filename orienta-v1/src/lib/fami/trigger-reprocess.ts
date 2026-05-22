import {
  reprocessFormForOrganization,
  type ReprocessMode,
} from "@/lib/supabase/workflows";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logError, logInfo } from "@/lib/observability/logger";

export type FamiReprocessReason =
  | "response_saved"
  | "evidence_removed"
  | "evidence_validated"
  | "form_submitted"
  | "form_published"
  | "waiver_changed"
  | "form_closed"
  | "manual_reprocess";

export type FamiReprocessResult = {
  processingVersion: number;
  recommendationsCreated: number;
  recommendationsUpdated?: number;
  recommendationsUnchanged?: number;
  recommendationsRemoved?: number;
  famiComputed: boolean;
};

async function resolveReprocessOptions(
  formId: string,
  reason: FamiReprocessReason,
  explicit?: { mode?: ReprocessMode },
): Promise<{ computeFami: boolean; mode: ReprocessMode }> {
  if (reason === "form_closed") {
    return { computeFami: true, mode: "closed" };
  }
  if (reason === "manual_reprocess") {
    const supabase = createSupabaseServiceRoleClient();
    const { data } = await supabase
      .from("forms")
      .select("state,closed_at")
      .eq("id", formId)
      .maybeSingle();
    if (data?.state === "closed" || data?.closed_at) {
      return { computeFami: true, mode: explicit?.mode ?? "closed" };
    }
  }
  return { computeFami: false, mode: "open" };
}

/**
 * Recalcula recomendações sempre; FAMI apenas no encerramento do ciclo (ou
 * reprocessamento manual com formulário já encerrado).
 */
export async function triggerFamiReprocess(
  formId: string,
  organizationId: string,
  reason: FamiReprocessReason,
  options?: { throwOnError?: boolean; mode?: ReprocessMode },
): Promise<FamiReprocessResult | null> {
  const resolved = await resolveReprocessOptions(formId, reason, options);
  try {
    const result = await reprocessFormForOrganization(formId, organizationId, {
      mode: resolved.mode,
      computeFami: resolved.computeFami,
    });
    logInfo("fami.reprocess.completed", {
      formId,
      organizationId,
      reason,
      mode: resolved.mode,
      computeFami: resolved.computeFami,
      processingVersion: result.processingVersion,
      recommendationsCreated: result.recommendationsCreated,
    });
    return {
      processingVersion: result.processingVersion,
      recommendationsCreated: result.recommendationsCreated,
      recommendationsUpdated: result.updated,
      recommendationsUnchanged: result.unchanged,
      recommendationsRemoved: result.removed,
      famiComputed: resolved.computeFami,
    };
  } catch (error) {
    logError("fami.reprocess.failed", error, { formId, organizationId, reason });
    if (options?.throwOnError) throw error;
    return null;
  }
}

/** Organizações com ao menos uma resposta no formulário. */
export async function listOrganizationIdsWithResponses(formId: string): Promise<string[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("responses")
    .select("organization_id")
    .eq("form_id", formId);
  if (error) throw error;
  return [...new Set((data ?? []).map((row) => row.organization_id as string).filter(Boolean))];
}

/**
 * Universo institucional: todas as organizacoes ativas (nao arquivadas).
 * Usado no encerramento do formulario para que orgaos sem nenhuma
 * resposta ainda recebam um snapshot FAMI oficial (% baixo, nao inexistente).
 */
export async function listActiveOrganizationIds(): Promise<string[]> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("organizations")
    .select("id");
  if (error) throw error;
  return (data ?? []).map((row) => row.id as string).filter(Boolean);
}

/**
 * Reprocessa um lote de organizacoes. FAMI só é gravado quando `reason` exige
 * (`form_closed` ou `manual_reprocess` em form encerrado).
 */
export async function triggerFamiReprocessForForm(
  formId: string,
  reason: FamiReprocessReason,
  options?: { includeAllOrganizations?: boolean; mode?: ReprocessMode },
): Promise<{ processed: number; failed: number; famiComputed: boolean }> {
  const resolved = await resolveReprocessOptions(formId, reason, options);
  const orgIds = options?.includeAllOrganizations
    ? await listActiveOrganizationIds()
    : await listOrganizationIdsWithResponses(formId);
  let processed = 0;
  let failed = 0;
  for (const organizationId of orgIds) {
    const result = await triggerFamiReprocess(formId, organizationId, reason, {
      mode: options?.mode,
    });
    if (result) processed += 1;
    else failed += 1;
  }
  logInfo("fami.reprocess.form_batch.completed", {
    formId,
    reason,
    mode: resolved.mode,
    computeFami: resolved.computeFami,
    includeAllOrganizations: options?.includeAllOrganizations ?? false,
    organizations: orgIds.length,
    processed,
    failed,
  });
  return { processed, failed, famiComputed: resolved.computeFami };
}

export async function resolveFamiScopeFromResponseId(
  responseId: string,
): Promise<{ formId: string; organizationId: string } | null> {
  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("responses")
    .select("form_id, organization_id")
    .eq("id", responseId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.form_id || !data.organization_id) return null;
  return {
    formId: data.form_id as string,
    organizationId: data.organization_id as string,
  };
}
