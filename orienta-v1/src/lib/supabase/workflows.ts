import { calculateFami } from "@/lib/domain/fami";
import { resolveScenario, RULE_VERSION } from "@/lib/domain/recommendation-engine-v2";
import { QuestionInput, RecommendationType, ValidationStatus } from "@/lib/domain/types";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import type { LibraryBindings, LibraryScenarioKey } from "@/lib/library/binding-types";
import {
  fetchQuestionStructures,
  type ResolvedQuestionStructure,
} from "@/lib/workbench/resolve-question-structure";
import { ensureStructuralAxesCatalog } from "@/lib/workbench/structural-catalog";
import { logInfo } from "@/lib/observability/logger";
import { createSupabaseServiceRoleClient } from "./server";

/**
 * Modo de coleta para o pipeline FAMI:
 * - `open`: Politica A — apenas perguntas com resposta entram no calculo
 *   (reprocessamento incremental durante a coleta). Compatibilidade total
 *   com o comportamento historico.
 * - `closed`: Politica B (encerramento) — o universo passa a ser TODAS as
 *   perguntas FAMI do formulario; pergunta sem resposta entra no denominador
 *   com 0 pontos; perguntas dispensadas/N\u00e3o-se-aplica saem do denominador.
 */
export type ReprocessMode = "open" | "closed";

type QuestionJoined = {
  section_id: string | null;
  requires_evidence: boolean;
  fami_enabled: boolean;
  recommendation_text: string | null;
  sections:
    | {
        axis_id: string;
      }[]
    | {
        axis_id: string;
      }
    | null;
};

type ResponseRow = {
  id: string;
  question_id: string;
  answer: "yes" | "no" | "not_applicable";
  is_not_applicable: boolean | null;
  questions: QuestionJoined | QuestionJoined[] | null;
};

type FormQuestionRow = {
  question_id: string;
  questions:
    | {
        section_id: string | null;
        requires_evidence: boolean;
        fami_enabled: boolean;
        recommendation_text: string | null;
      }
    | Array<{
        section_id: string | null;
        requires_evidence: boolean;
        fami_enabled: boolean;
        recommendation_text: string | null;
      }>
    | null;
};

/**
 * Mapeia o cenario v2 (texto curto da biblioteca) para o `recommendation_type`
 * persistido na tabela `recommendations`. Só geramos linha para cenarios que
 * representam gaps reais de maturidade ou comprovação inválida; demais
 * cenarios (ex. `nao_se_aplica`, `sim_evidencia_valida`, `sim_sem_evidencia`)
 * são ignorados aqui.
 *
 * Nota: `sim_sem_evidencia` (resposta positiva ainda sem comprovante) NÃO
 * gera recomendação — é uma pendência de evidência tratada no fluxo de
 * validação. Só após a evidência ser rejeitada (`sim_evidencia_invalida`)
 * surge `insufficient_evidence`.
 */
const SCENARIO_TO_TYPE: Partial<Record<LibraryScenarioKey, RecommendationType>> = {
  nao: "not_implemented",
  sim_evidencia_invalida: "insufficient_evidence",
};

/** Concatena titulo, descricao e textos base da recomendacao inline do binding. */
function renderInlineRecommendationText(rec: {
  title?: string | null;
  description?: string | null;
  textoBaseFixo?: string | null;
  textoBaseParametrizavel?: string | null;
}): string {
  const parts = [
    rec.title?.trim(),
    rec.description?.trim(),
    rec.textoBaseFixo?.trim(),
    rec.textoBaseParametrizavel?.trim(),
  ].filter((v): v is string => Boolean(v && v.length > 0));
  if (parts.length === 0) return rec.title?.trim() ?? "";
  return parts.join("\n\n");
}

export type CollectResult = {
  questions: QuestionInput[];
  responseMeta: Map<
    string,
    {
      legacyText: string;
      bindings: LibraryBindings | null;
      hasEvidence: boolean;
      snapshotHash: string | null;
    }
  >;
};

export type RecommendationReprocessStats = {
  created: number;
  updated: number;
  unchanged: number;
  removed: number;
  /** Compatibilidade: numero de linhas novas inseridas. */
  recommendationsCreated: number;
};

const PRESERVED_RECOMMENDATION_STATUSES = new Set<RecommendationStatus>([
  "in_progress",
  "resolved",
  "dismissed",
]);

type DesiredRecommendationRow = {
  question_id: string;
  recommendation_type: RecommendationType;
  original_text: string;
  current_text: string;
  scenario: LibraryScenarioKey;
  snapshot_hash: string | null;
  rule_version: string;
  confidence_score: number;
};

type ExistingRecommendationRow = {
  id: string;
  question_id: string;
  status: RecommendationStatus;
  recommendation_type: string;
  current_text: string;
  original_text: string;
  scenario: string | null;
};

async function syncRecommendationsForOrganization(
  supabase: ReturnType<typeof createSupabaseServiceRoleClient>,
  formId: string,
  organizationId: string,
  desiredRows: DesiredRecommendationRow[],
): Promise<RecommendationReprocessStats> {
  const { data: existingRows, error: loadError } = await supabase
    .from("recommendations")
    .select("id, question_id, status, recommendation_type, current_text, original_text, scenario")
    .eq("form_id", formId)
    .eq("organization_id", organizationId);
  if (loadError) throw loadError;

  const existingByQuestion = new Map<string, ExistingRecommendationRow>();
  for (const row of existingRows ?? []) {
    existingByQuestion.set(row.question_id as string, row as ExistingRecommendationRow);
  }

  const desiredByQuestion = new Map<string, DesiredRecommendationRow>();
  for (const row of desiredRows) {
    desiredByQuestion.set(row.question_id, row);
  }

  let created = 0;
  let updated = 0;
  let unchanged = 0;
  let removed = 0;

  for (const [questionId, desired] of desiredByQuestion) {
    const existing = existingByQuestion.get(questionId);
    if (!existing) {
      const { error: insertError } = await supabase.from("recommendations").insert({
        form_id: formId,
        organization_id: organizationId,
        question_id: desired.question_id,
        recommendation_type: desired.recommendation_type,
        original_text: desired.original_text,
        current_text: desired.current_text,
        status: "open",
        scenario: desired.scenario,
        snapshot_hash: desired.snapshot_hash,
        rule_version: desired.rule_version,
        confidence_score: desired.confidence_score,
      });
      if (insertError) throw insertError;
      created += 1;
      continue;
    }

    const typeChanged = existing.recommendation_type !== desired.recommendation_type;
    const textChanged =
      existing.current_text !== desired.current_text ||
      existing.original_text !== desired.original_text;
    const scenarioChanged = (existing.scenario ?? null) !== desired.scenario;
    const metaChanged = typeChanged || textChanged || scenarioChanged;

    if (!metaChanged) {
      unchanged += 1;
      continue;
    }

    const preserveStatus = PRESERVED_RECOMMENDATION_STATUSES.has(existing.status);
    const patch: Record<string, unknown> = {
      recommendation_type: desired.recommendation_type,
      original_text: desired.original_text,
      scenario: desired.scenario,
      snapshot_hash: desired.snapshot_hash,
      rule_version: desired.rule_version,
      confidence_score: desired.confidence_score,
    };
    if (preserveStatus) {
      if (textChanged) patch.current_text = desired.current_text;
    } else {
      patch.current_text = desired.current_text;
      if (existing.status === "open") {
        patch.status = "open";
      }
    }

    const { error: updateError } = await supabase
      .from("recommendations")
      .update(patch)
      .eq("id", existing.id);
    if (updateError) throw updateError;
    updated += 1;
  }

  const toRemove = [...existingByQuestion.keys()].filter((qid) => !desiredByQuestion.has(qid));
  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("recommendations")
      .delete()
      .eq("form_id", formId)
      .eq("organization_id", organizationId)
      .in("question_id", toRemove);
    if (deleteError) throw deleteError;
    removed = toRemove.length;
  }

  return {
    created,
    updated,
    unchanged,
    removed,
    recommendationsCreated: created,
  };
}

export async function collectQuestionInputs(
  formId: string,
  organizationId: string,
  options?: { mode?: ReprocessMode },
): Promise<CollectResult> {
  const supabase = createSupabaseServiceRoleClient();
  const mode: ReprocessMode = options?.mode ?? "open";

  const { data: formRow } = await supabase.from("forms").select("version").eq("id", formId).maybeSingle();
  const formVersion = Number(formRow?.version ?? 1);

  // Importante: NAO usar `sections!inner(axis_id)` aqui. Perguntas criadas pelo
  // fluxo novo (Biblioteca) tem `questions.section_id = NULL` — o eixo/secao
  // vem de `question_library_binding`. Inner join filtraria essas respostas
  // inteiras e nenhuma recomendacao seria gerada.
  const { data: responses, error: responsesError } = await supabase
    .from("responses")
    .select(
      "id,question_id,answer,is_not_applicable,questions!inner(section_id,requires_evidence,fami_enabled,recommendation_text,sections(axis_id))",
    )
    .eq("form_id", formId)
    .eq("organization_id", organizationId);

  if (responsesError) throw responsesError;

  const typedResponses = (responses ?? []) as unknown as ResponseRow[];
  const responseIds = typedResponses.map((row) => row.id);
  const responseByQuestion = new Map<string, ResponseRow>();
  for (const r of typedResponses) responseByQuestion.set(r.question_id, r);

  const responseQuestionIds = [...new Set(typedResponses.map((r) => r.question_id))];

  // Dispensa institucional por par (pergunta, org) — vale em qualquer formulário.
  const { data: waiverRows, error: waiverErr } = await supabase
    .from("question_organization_waivers")
    .select("question_id")
    .eq("organization_id", organizationId);
  if (waiverErr) throw waiverErr;
  const waivedQuestionIds = new Set<string>(
    (waiverRows ?? []).map((row) => row.question_id as string),
  );

  // Modo `closed`: precisa do catalogo completo de perguntas FAMI do form.
  let closedQuestionRows: Array<{
    questionId: string;
    requiresEvidence: boolean;
    famiEnabled: boolean;
    legacyText: string;
    sectionIdLegacy: string | null;
  }> = [];
  if (mode === "closed") {
    const { data, error } = await supabase
      .from("form_questions")
      .select(
        "question_id,questions!inner(section_id,requires_evidence,fami_enabled,recommendation_text)",
      )
      .eq("form_id", formId);
    if (error) throw error;
    const rows = (data ?? []) as unknown as FormQuestionRow[];
    closedQuestionRows = rows.map((row) => {
      const q = Array.isArray(row.questions) ? row.questions[0] : row.questions;
      return {
        questionId: row.question_id,
        requiresEvidence: q?.requires_evidence ?? false,
        famiEnabled: q?.fami_enabled ?? true,
        legacyText: q?.recommendation_text?.trim() ?? "",
        sectionIdLegacy: (q?.section_id as string | null) ?? null,
      };
    });
  }

  const allQuestionIds =
    mode === "closed"
      ? [...new Set([...responseQuestionIds, ...closedQuestionRows.map((r) => r.questionId)])]
      : responseQuestionIds;

  const bindingsByQuestion = new Map<string, LibraryBindings | null>();
  const snapshotHashByQuestion = new Map<string, string | null>();
  let structuresByQuestion = new Map<string, ResolvedQuestionStructure>();
  if (allQuestionIds.length > 0) {
    const [{ data: snaps }, structures] = await Promise.all([
      supabase
        .from("form_question_library_snapshot")
        .select("question_id,bindings,hash")
        .eq("form_id", formId)
        .eq("form_version", formVersion)
        .in("question_id", allQuestionIds),
      fetchQuestionStructures(supabase, allQuestionIds),
    ]);
    structuresByQuestion = structures;
    for (const row of snaps ?? []) {
      const qid = row.question_id as string;
      bindingsByQuestion.set(qid, (row.bindings as LibraryBindings | null) ?? null);
      snapshotHashByQuestion.set(qid, (row.hash as string | null) ?? null);
    }
  }

  const validationStatusByResponseId = new Map<string, ValidationStatus>();
  const hasEvidenceByResponseId = new Set<string>();
  if (responseIds.length > 0) {
    const { data: evidences, error: evidenceError } = await supabase
      .from("evidences")
      .select("id,response_id")
      .in("response_id", responseIds);
    if (evidenceError) throw evidenceError;

    for (const evidence of evidences ?? []) {
      hasEvidenceByResponseId.add(evidence.response_id as string);
    }

    const evidenceIds = (evidences ?? []).map((e) => e.id);
    if (evidenceIds.length > 0) {
      const { data: validations, error: validationError } = await supabase
        .from("evidence_validations")
        .select("evidence_id,status,validated_at")
        .in("evidence_id", evidenceIds)
        .order("validated_at", { ascending: false });
      if (validationError) throw validationError;

      const evidenceToResponse = new Map<string, string>();
      for (const evidence of evidences ?? []) {
        evidenceToResponse.set(evidence.id, evidence.response_id);
      }
      for (const validation of validations ?? []) {
        const responseId = evidenceToResponse.get(validation.evidence_id);
        if (responseId && !validationStatusByResponseId.has(responseId)) {
          validationStatusByResponseId.set(responseId, validation.status as ValidationStatus);
        }
      }
    }
  }

  const questions: QuestionInput[] = [];
  const responseMeta: CollectResult["responseMeta"] = new Map();

  const processedQuestionIds = new Set<string>();

  for (const response of typedResponses) {
    if (!response.questions) continue;

    const question = (Array.isArray(response.questions)
      ? response.questions[0]
      : response.questions) as QuestionJoined | undefined;
    if (!question) continue;

    const structure = structuresByQuestion.get(response.question_id);
    const axisId = structure?.structuralAxisId ?? null;
    const sectionId = structure?.sectionId ?? question.section_id ?? null;
    if (!axisId || !sectionId) {
      logInfo("reprocess.skip_question_missing_structure", {
        questionId: response.question_id,
        axisId,
        sectionId,
        structureSource: structure?.source ?? null,
      });
      continue;
    }

    const legacyText = question.recommendation_text?.trim() ?? "";
    const isNotApplicable =
      waivedQuestionIds.has(response.question_id) || response.is_not_applicable === true;

    questions.push({
      id: response.question_id,
      axisId,
      sectionId,
      famiEnabled: question.fami_enabled,
      requiresEvidence: question.requires_evidence,
      answer: response.answer,
      validationStatus: validationStatusByResponseId.get(response.id),
      isNotApplicable,
    });
    responseMeta.set(response.question_id, {
      legacyText: legacyText !== "" ? legacyText : "Recomendacao vinculada a esta pergunta.",
      bindings: bindingsByQuestion.get(response.question_id) ?? null,
      hasEvidence: hasEvidenceByResponseId.has(response.id),
      snapshotHash: snapshotHashByQuestion.get(response.question_id) ?? null,
    });
    processedQuestionIds.add(response.question_id);
  }

  if (mode === "closed") {
    for (const row of closedQuestionRows) {
      if (processedQuestionIds.has(row.questionId)) continue;
      const structure = structuresByQuestion.get(row.questionId);
      const axisId = structure?.structuralAxisId ?? null;
      const sectionId = structure?.sectionId ?? row.sectionIdLegacy ?? null;
      if (!axisId || !sectionId) {
        logInfo("reprocess.skip_question_missing_structure", {
          questionId: row.questionId,
          axisId,
          sectionId,
          structureSource: structure?.source ?? null,
          mode: "closed",
        });
        continue;
      }

      const isWaived = waivedQuestionIds.has(row.questionId);
      questions.push({
        id: row.questionId,
        axisId,
        sectionId,
        famiEnabled: row.famiEnabled,
        requiresEvidence: row.requiresEvidence,
        answer: "no",
        validationStatus: undefined,
        isNotApplicable: isWaived,
      });
      responseMeta.set(row.questionId, {
        legacyText: row.legacyText !== ""
          ? row.legacyText
          : "Recomendacao vinculada a esta pergunta.",
        bindings: bindingsByQuestion.get(row.questionId) ?? null,
        hasEvidence: false,
        snapshotHash: snapshotHashByQuestion.get(row.questionId) ?? null,
      });
      processedQuestionIds.add(row.questionId);
    }
  }

  return { questions, responseMeta };
}

export async function reprocessFormForOrganization(
  formId: string,
  organizationId: string,
  options?: { mode?: ReprocessMode; computeFami?: boolean },
) {
  const computeFami = options?.computeFami ?? false;
  const mode = options?.mode ?? (computeFami ? "closed" : "open");
  const supabase = createSupabaseServiceRoleClient();
  await ensureStructuralAxesCatalog(supabase);
  const { questions, responseMeta } = await collectQuestionInputs(formId, organizationId, {
    mode,
  });

  const { data: previousResults, error: versionError } = await supabase
    .from("fami_results")
    .select("processing_version")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .order("processing_version", { ascending: false })
    .limit(1);
  if (versionError) throw versionError;

  const previousVersion = Number(previousResults?.[0]?.processing_version ?? 0);
  let nextVersion = previousVersion;
  let summary: ReturnType<typeof calculateFami> | null = null;

  if (computeFami) {
    summary = calculateFami(questions);
    nextVersion = previousVersion + 1;

  const famiRows = [
    ...Object.entries(summary.bySection).map(([sectionId, result]) => ({
      form_id: formId,
      organization_id: organizationId,
      processing_version: nextVersion,
      scope_type: "section",
      scope_id: sectionId,
      points_obtained: result.pointsObtained,
      points_possible: result.pointsPossible,
      percentage: result.percentage,
      maturity_level: result.maturityLevel,
    })),
    ...Object.entries(summary.byAxis).map(([axisId, result]) => ({
      form_id: formId,
      organization_id: organizationId,
      processing_version: nextVersion,
      scope_type: "axis",
      scope_id: axisId,
      points_obtained: result.pointsObtained,
      points_possible: result.pointsPossible,
      percentage: result.percentage,
      maturity_level: result.maturityLevel,
    })),
    {
      form_id: formId,
      organization_id: organizationId,
      processing_version: nextVersion,
      scope_type: "global",
      scope_id: null,
      points_obtained: summary.global.pointsObtained,
      points_possible: summary.global.pointsPossible,
      percentage: summary.global.percentage,
      maturity_level: summary.global.maturityLevel,
    },
  ];

  const { error: famiInsertError } = await supabase.from("fami_results").insert(famiRows);
  if (famiInsertError) throw famiInsertError;
  }

  const desiredRecommendations: DesiredRecommendationRow[] = [];
  for (const question of questions) {
    if (!question.famiEnabled || question.isNotApplicable) continue;
    const meta = responseMeta.get(question.id);
    if (!meta) continue;

    const resolution = resolveScenario({
      answer: question.answer,
      requiresEvidence: question.requiresEvidence,
      validationStatus: question.validationStatus,
      isNotApplicable: question.isNotApplicable,
      hasEvidenceSubmitted: meta.hasEvidence,
    });

    const recommendationType = SCENARIO_TO_TYPE[resolution.scenario];
    if (!recommendationType) continue;

    let text = meta.legacyText;
    const binding = meta.bindings ? meta.bindings[resolution.scenario] : undefined;
    if (binding?.recommendation?.title?.trim()) {
      const rendered = renderInlineRecommendationText(binding.recommendation);
      if (rendered !== "") text = rendered;
    }

    desiredRecommendations.push({
      question_id: question.id,
      recommendation_type: recommendationType,
      original_text: text,
      current_text: text,
      scenario: resolution.scenario,
      snapshot_hash: meta.snapshotHash,
      rule_version: RULE_VERSION,
      confidence_score: resolution.confidence,
    });
  }

  const recommendationStats = await syncRecommendationsForOrganization(
    supabase,
    formId,
    organizationId,
    desiredRecommendations,
  );

  return {
    processingVersion: nextVersion,
    ...recommendationStats,
    fami: summary,
  };
}
