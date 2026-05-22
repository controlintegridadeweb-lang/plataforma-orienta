import { NextResponse } from "next/server";
import type { AuthContext } from "./auth";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

function forbidden(message: string) {
  return NextResponse.json({ error: message }, { status: 403 });
}

/**
 * Garante que o usuario tem acesso a organizacao informada.
 * - admin e analyst: visao cross-org (responder/validar em qualquer organizacao)
 * - respondent: somente a organizacao vinculada ao perfil
 */
export function ensureOrganizationAccess(context: AuthContext, organizationId: string) {
  if (context.role === "admin" || context.role === "analyst") {
    return null;
  }
  if (!context.organizationId) {
    return forbidden("Usuario sem organizacao vinculada.");
  }
  if (context.organizationId !== organizationId) {
    return forbidden("Acesso fora da organizacao permitida.");
  }
  return null;
}

export async function ensureRecommendationAccess(context: AuthContext, recommendationId: string) {
  // Admin tem visao cross-org para operacao da fila de recomendacoes.
  if (context.role === "admin") {
    const supabase = createSupabaseServiceRoleClient();
    const { data, error } = await supabase
      .from("recommendations")
      .select("id")
      .eq("id", recommendationId)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: "Recomendacao nao encontrada." }, { status: 404 });
    }
    return null;
  }

  if (!context.organizationId) {
    return forbidden("Usuario sem organizacao vinculada.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("recommendations")
    .select("organization_id")
    .eq("id", recommendationId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Recomendacao nao encontrada." }, { status: 404 });
  }

  if (data.organization_id !== context.organizationId) {
    return forbidden("Acesso fora da organizacao permitida.");
  }
  return null;
}

export async function ensureResponseAccess(context: AuthContext, responseId: string) {
  if (!context.organizationId) {
    return forbidden("Usuario sem organizacao vinculada.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("responses")
    .select("organization_id")
    .eq("id", responseId)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Resposta nao encontrada." }, { status: 404 });
  }
  if (data.organization_id !== context.organizationId) {
    return forbidden("Acesso fora da organizacao permitida.");
  }
  return null;
}

/**
 * Garante que o usuario tem acesso a evidencia dada. Admin pode ver/validar
 * evidencias de qualquer organizacao (visao operacional cross-org); analyst
 * fica restrito a organizacao do seu perfil.
 */
export async function ensureEvidenceAccess(
  context: AuthContext,
  evidenceId: string,
) {
  if (context.role === "admin") return null;
  if (!context.organizationId) {
    return forbidden("Usuario sem organizacao vinculada.");
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data, error } = await supabase
    .from("evidences")
    .select("id, response_id, responses!inner(organization_id)")
    .eq("id", evidenceId)
    .maybeSingle();
  if (error || !data) {
    return NextResponse.json({ error: "Evidencia nao encontrada." }, { status: 404 });
  }
  const rel = (data as { responses: { organization_id: string } | { organization_id: string }[] })
    .responses;
  const orgId = Array.isArray(rel) ? rel[0]?.organization_id : rel?.organization_id;
  if (!orgId) {
    return NextResponse.json({ error: "Evidencia nao encontrada." }, { status: 404 });
  }
  if (orgId !== context.organizationId) {
    return forbidden("Acesso fora da organizacao permitida.");
  }
  return null;
}
