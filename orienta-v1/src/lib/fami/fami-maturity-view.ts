import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AxisMaturity } from "@/lib/fami/types";
import { getCalendarYearBrt } from "@/lib/fami/fami-year";
import {
  loadFamiFormContext,
  resolveFamiContextForScope,
  type FamiScope,
} from "@/lib/fami/fami-context";
import {
  loadAxisMaturityForVersion,
  loadFamiGlobalForVersion,
} from "@/lib/fami/fami-snapshot-read";

/**
 * Contrato único consumido por dashboard, tela FAMI, relatório e cards do
 * respondente. Garante que “score global”, “média por eixo” e contagem de
 * perguntas aplicáveis tenham a mesma origem em todas as superfícies.
 */
export type FamiMaturityView = {
  scope: FamiScope;
  formId: string;
  formName: string;
  formVersion: number;
  formState: string;
  organizationId: string;
  processingVersion: number;
  referenceYear: number;
  global: {
    percentage: number;
    maturityLevel: number;
    pointsObtained: number;
    pointsPossible: number;
  };
  axes: AxisMaturity[];
  meta: {
    applicableQuestions: number;
    waivedQuestions: number;
    notApplicableResponses: number;
    isOfficialScore: boolean;
    reprocessedAt: string;
    closedAt: string | null;
    responseDeadlineAt: string | null;
  };
};

/**
 * Conta perguntas aplicáveis, dispensadas (waivers) e marcações de “Não se
 * aplica” no respondente, para o par (form, org). Pesado o suficiente para ter
 * sua própria função; usado em metadados do view e do relatório.
 */
async function countMetaQuestions(
  formId: string,
  organizationId: string,
): Promise<{
  applicable: number;
  waived: number;
  notApplicableResponses: number;
}> {
  const client = createSupabaseServiceRoleClient();

  const { data: formQuestionRows, error: fqErr } = await client
    .from("form_questions")
    .select("question_id")
    .eq("form_id", formId);
  if (fqErr) throw fqErr;
  const questionIds = (formQuestionRows ?? []).map((r) => r.question_id as string);

  let waivedCount = 0;
  if (questionIds.length > 0) {
    const { count: waived, error: waiverErr } = await client
      .from("question_organization_waivers")
      .select("question_id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("question_id", questionIds);
    if (waiverErr) throw waiverErr;
    waivedCount = waived ?? 0;
  }

  const { count: notApplicableResponses, error: naErr } = await client
    .from("responses")
    .select("id", { count: "exact", head: true })
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("is_not_applicable", true);
  if (naErr) throw naErr;

  const total = questionIds.length;
  return {
    applicable: Math.max(0, total - waivedCount),
    waived: waivedCount,
    notApplicableResponses: notApplicableResponses ?? 0,
  };
}

/**
 * Builder único de leitura. Para escopos `latest-org` sem snapshot, devolve
 * `null` — quem chama deve renderizar estado vazio em vez de zeros.
 */
export async function buildFamiMaturityView(
  scope: FamiScope,
): Promise<FamiMaturityView | null> {
  const resolved = await resolveFamiContextForScope(scope);
  if (!resolved) return null;

  const { formId, organizationId, processingVersion } = resolved;

  const [formContext, global, axes] = await Promise.all([
    loadFamiFormContext(formId),
    loadFamiGlobalForVersion(formId, organizationId, processingVersion),
    loadAxisMaturityForVersion(formId, organizationId, processingVersion),
  ]);

  if (!global) return null;

  /** Sem encerramento prévio não exibe FAMI (cálculo só no close). */
  if (formContext?.formState !== "closed" && !formContext?.closedAt) return null;

  const meta = await countMetaQuestionsSafe(formId, organizationId);

  const referenceYear = global.createdAt ? getCalendarYearBrt(global.createdAt) : new Date().getFullYear();

  return {
    scope,
    formId,
    formName: formContext?.formName ?? "",
    formVersion: formContext?.formVersion ?? 1,
    formState: formContext?.formState ?? "draft",
    organizationId,
    processingVersion,
    referenceYear,
    global: {
      percentage: global.percentage,
      maturityLevel: global.maturityLevel,
      pointsObtained: global.pointsObtained,
      pointsPossible: global.pointsPossible,
    },
    axes,
    meta: {
      applicableQuestions: meta.applicable,
      waivedQuestions: meta.waived,
      notApplicableResponses: meta.notApplicableResponses,
      isOfficialScore: Boolean(formContext?.closedAt),
      reprocessedAt: global.createdAt,
      closedAt: formContext?.closedAt ?? null,
      responseDeadlineAt: formContext?.responseDeadlineAt ?? null,
    },
  };
}

/**
 * Variante tolerante a erros: se as tabelas auxiliares (`waivers`,
 * `is_not_applicable`) ainda não estiverem migradas no ambiente, retorna zeros
 * sem quebrar a chamada principal.
 */
async function countMetaQuestionsSafe(
  formId: string,
  organizationId: string,
): Promise<{ applicable: number; waived: number; notApplicableResponses: number }> {
  try {
    return await countMetaQuestions(formId, organizationId);
  } catch {
    return { applicable: 0, waived: 0, notApplicableResponses: 0 };
  }
}
