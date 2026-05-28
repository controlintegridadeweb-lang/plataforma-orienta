import type { SupabaseClient } from "@supabase/supabase-js";
import type { LibraryMetricAnswerType } from "@/lib/library/types";
import { fetchQuestionStructures } from "@/lib/workbench/resolve-question-structure";

type WorkbenchForm = {
  id: string;
  name: string;
  version: number;
  state: string;
  responseDeadlineAt: string | null;
  closedAt: string | null;
};

/** Mesmo universo de `LibraryMetricAnswerType` (origem canonica em `@/lib/library/types`). */
function metricAnswerTypeFromBinding(metricRaw: unknown): LibraryMetricAnswerType | null {
  if (!metricRaw || typeof metricRaw !== "object") return null;
  const at = (metricRaw as Record<string, unknown>).answerType;
  if (at === "yes_no" || at === "scale" || at === "numeric" || at === "text") return at;
  return null;
}

/** Contrato V2: nao existe mais resposta parcial no workbench. */
export function workbenchRowAllowsPartial(row: {
  metricAnswerType: LibraryMetricAnswerType | null;
}): boolean {
  return false;
}

export type WorkbenchRow = {
  questionId: string;
  prompt: string;
  /** Tipo de resposta da metrica inline (vinculo); null se sem metric ou legado vazio. */
  metricAnswerType: LibraryMetricAnswerType | null;
  requiresEvidence: boolean;
  recommendationText: string;
  axisName: string;
  sectionName: string;
  responseId: string | null;
  answer: "yes" | "no" | "not_applicable" | null;
  notes: string | null;
  /** Respondente marcou "Nao se aplica" — fora do denominador FAMI. */
  isNotApplicable: boolean;
  evidenceId: string | null;
  evidenceTitle: string | null;
  evidenceDescription: string | null;
  externalLink: string | null;
  storagePath: string | null;
  validationStatus: string | null;
};

/**
 * Carrega formulario, questoes, respostas, evidencia e validacao (mesma regra
 * de negocio que /api/dev/workbench-data) usando cliente Supabase (service).
 */
export async function loadWorkbenchPayload(
  supabase: SupabaseClient,
  formId: string,
  organizationId: string,
): Promise<{ form: WorkbenchForm; rows: WorkbenchRow[] }> {
  const [{ data: form, error: formError }, { data: questions, error: questionsError }] =
    await Promise.all([
      supabase
        .from("forms")
        .select("id,name,version,state,response_deadline_at,closed_at")
        .eq("id", formId)
        .single(),
      supabase
        .from("form_questions")
        .select("question_id,questions!inner(id,prompt,requires_evidence,recommendation_text,section_id)")
        .eq("form_id", formId),
    ]);
  if (formError) throw formError;
  if (questionsError) throw questionsError;

  const questionIds = (questions ?? []).map((q) => q.question_id as string);

  const [{ data: bindings, error: bindingsError }, structures] = await Promise.all([
    questionIds.length > 0
      ? supabase
          .from("question_library_binding")
          .select("question_id,metric")
          .in("question_id", questionIds)
      : Promise.resolve({ data: [], error: null }),
    fetchQuestionStructures(supabase, questionIds),
  ]);
  if (bindingsError) throw bindingsError;

  const { data: responses, error: responseError } = await supabase
    .from("responses")
    .select("id,question_id,answer,notes,is_not_applicable")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .in("question_id", questionIds);
  if (responseError) throw responseError;

  const responseIds = (responses ?? []).map((r) => r.id);
  const { data: evidences, error: evidenceError } =
    responseIds.length > 0
      ? await supabase
          .from("evidences")
          .select("id,response_id,title,description,storage_path,external_link")
          .in("response_id", responseIds)
      : { data: [], error: null };
  if (evidenceError) throw evidenceError;

  const evidenceIds = (evidences ?? []).map((e) => e.id);
  const { data: validations, error: validationError } =
    evidenceIds.length > 0
      ? await supabase
          .from("evidence_validations")
          .select("evidence_id,status,validated_at")
          .in("evidence_id", evidenceIds)
          .order("validated_at", { ascending: false })
      : { data: [], error: null };
  if (validationError) throw validationError;

  const responseByQuestion = new Map((responses ?? []).map((r) => [r.question_id, r]));
  const bindingByQuestion = new Map(
    (bindings ?? []).map((binding) => [binding.question_id as string, binding]),
  );
  const evidenceByResponse = new Map<string, (typeof evidences)[number]>();
  for (const evidence of evidences ?? []) {
    if (!evidenceByResponse.has(evidence.response_id)) {
      evidenceByResponse.set(evidence.response_id, evidence);
    }
  }
  const latestValidationByEvidence = new Map<string, (typeof validations)[number]>();
  for (const validation of validations ?? []) {
    if (!latestValidationByEvidence.has(validation.evidence_id)) {
      latestValidationByEvidence.set(validation.evidence_id, validation);
    }
  }

  const rows: WorkbenchRow[] = (questions ?? []).map((row) => {
    const questionId = row.question_id as string;
    const response = responseByQuestion.get(questionId);
    const evidence = response ? evidenceByResponse.get(response.id) : undefined;
    const validation = evidence ? latestValidationByEvidence.get(evidence.id) : undefined;

    const question = Array.isArray(row.questions) ? row.questions[0] : row.questions;
    const binding = bindingByQuestion.get(questionId);
    const structure = structures.get(questionId);
    const metricAnswerType = metricAnswerTypeFromBinding(
      binding && typeof binding === "object" && binding !== null && "metric" in binding
        ? (binding as { metric?: unknown }).metric
        : null,
    );

    return {
      questionId,
      prompt: question.prompt,
      metricAnswerType,
      requiresEvidence: question.requires_evidence,
      recommendationText: question.recommendation_text ?? "",
      axisName: structure?.axisName ?? "",
      sectionName: structure?.sectionName ?? "",
      responseId: response?.id ?? null,
      answer: (response?.answer as WorkbenchRow["answer"]) ?? null,
      notes: response?.notes ?? null,
      isNotApplicable:
        (response as { is_not_applicable?: boolean } | undefined)
          ?.is_not_applicable === true,
      evidenceId: evidence?.id ?? null,
      evidenceTitle: evidence?.title ?? null,
      evidenceDescription: evidence?.description ?? null,
      externalLink: evidence?.external_link ?? null,
      storagePath: evidence?.storage_path ?? null,
      validationStatus: validation?.status ?? null,
    };
  });

  const rawForm = form as {
    id: string;
    name: string;
    version: number;
    state: string;
    response_deadline_at: string | null;
    closed_at: string | null;
  };

  return {
    form: {
      id: rawForm.id,
      name: rawForm.name,
      version: rawForm.version,
      state: rawForm.state,
      responseDeadlineAt: rawForm.response_deadline_at ?? null,
      closedAt: rawForm.closed_at ?? null,
    },
    rows,
  };
}
