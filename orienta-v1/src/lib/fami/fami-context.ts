import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  resolveLatestFamiContextForOrganization,
  resolveYearEndFamiContextForOrganization,
} from "@/lib/fami/queries";

/** Estado do formulário relevante para distinguir score provisório vs oficial. */
export type FamiFormState = string;

export type FamiFormContext = {
  formId: string;
  formName: string;
  formVersion: number;
  formState: FamiFormState;
  closedAt: string | null;
  responseDeadlineAt: string | null;
};

export type FamiScope =
  | {
      kind: "form-org";
      formId: string;
      organizationId: string;
      processingVersion?: number;
      closingYear?: number | null;
    }
  | {
      kind: "latest-org";
      organizationId: string;
      closingYear?: number | null;
    };

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

function getClient(): Client {
  return createSupabaseServiceRoleClient();
}

/**
 * Lê metadados do formulário (nome, versão, estado, prazo, closed_at). Falha
 * silenciosamente devolvendo `null` quando o form não existe.
 */
export async function loadFamiFormContext(formId: string): Promise<FamiFormContext | null> {
  const client = getClient();
  const { data, error } = await client
    .from("forms")
    .select("id,name,version,state,closed_at,response_deadline_at")
    .eq("id", formId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    formId: data.id as string,
    formName: (data.name as string) ?? "",
    formVersion: Number(data.version ?? 1),
    formState: (data.state as string) ?? "draft",
    closedAt: (data.closed_at as string | null) ?? null,
    responseDeadlineAt: (data.response_deadline_at as string | null) ?? null,
  };
}

/**
 * Resolve o par (formId, processingVersion) para o escopo informado. Devolve
 * `null` quando não há snapshot FAMI gravado.
 */
export async function resolveFamiContextForScope(
  scope: FamiScope,
): Promise<{ formId: string; organizationId: string; processingVersion: number } | null> {
  if (scope.kind === "form-org") {
    if (scope.processingVersion && scope.processingVersion > 0) {
      return {
        formId: scope.formId,
        organizationId: scope.organizationId,
        processingVersion: scope.processingVersion,
      };
    }
    if (scope.closingYear != null) {
      const ctx = await resolveYearEndFamiContextForOrganization(
        scope.organizationId,
        scope.closingYear,
      );
      if (!ctx || ctx.formId !== scope.formId) return null;
      return {
        formId: scope.formId,
        organizationId: scope.organizationId,
        processingVersion: ctx.processingVersion,
      };
    }
    const { resolveLatestFamiVersionForFormOrg } = await import(
      "@/lib/fami/fami-snapshot-read"
    );
    const version = await resolveLatestFamiVersionForFormOrg(
      scope.formId,
      scope.organizationId,
    );
    if (version == null) return null;
    return {
      formId: scope.formId,
      organizationId: scope.organizationId,
      processingVersion: version,
    };
  }

  const ctx =
    scope.closingYear != null
      ? await resolveYearEndFamiContextForOrganization(scope.organizationId, scope.closingYear)
      : await resolveLatestFamiContextForOrganization(scope.organizationId);
  if (!ctx) return null;
  return {
    formId: ctx.formId,
    organizationId: scope.organizationId,
    processingVersion: ctx.processingVersion,
  };
}

/** Helper: snapshot é oficial quando o formulário está encerrado. */
export function isOfficialScoreFromFormState(state: FamiFormState | null): boolean {
  return state === "closed";
}
