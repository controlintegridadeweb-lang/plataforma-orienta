import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { logInfo } from "@/lib/observability/logger";
import {
  LIBRARY_REQUIRED_SCENARIOS,
  LIBRARY_SCENARIOS,
  getRequiredScenariosFor,
  type FormQuestionLibrarySnapshot,
  type InlineLibraryAction,
  type InlineLibraryRecommendation,
  type InlineMetric,
  type LibraryBindings,
  type LibraryScenarioBinding,
  type LibraryScenarioKey,
  type QuestionLibraryBinding,
  type ResponseMapping,
} from "./binding-types";
import {
  questionBindingInputSchema,
  type QuestionBindingInput,
} from "./binding-schemas";
import { LibraryValidationError } from "./service";
import { LibraryRepository } from "./repository";

type Client = SupabaseClient;

type BindingRow = {
  question_id: string;
  axis_id: string | null;
  section_id: string | null;
  metric_id: string | null;
  metric?: unknown;
  bindings: unknown;
  response_mapping?: unknown;
  coverage_score: number | string;
  updated_by: string | null;
  updated_at: string;
};

function parseInlineRecommendation(raw: unknown): InlineLibraryRecommendation | null {
  if (!raw || typeof raw !== "object") return null;
  const s = raw as Record<string, unknown>;
  const title = typeof s.title === "string" ? s.title.trim() : "";
  if (!title) return null;
  return {
    title,
    description: typeof s.description === "string" ? s.description : null,
    textoBaseFixo: typeof s.textoBaseFixo === "string" ? s.textoBaseFixo : null,
    textoBaseParametrizavel:
      typeof s.textoBaseParametrizavel === "string" ? s.textoBaseParametrizavel : null,
    tipo:
      s.tipo === "nao_implementacao" ||
      s.tipo === "implementacao_parcial" ||
      s.tipo === "ausencia_evidencia" ||
      s.tipo === "evidencia_insuficiente"
        ? s.tipo
        : null,
    fundamentoTecnico: typeof s.fundamentoTecnico === "string" ? s.fundamentoTecnico : null,
    escopoAplicacao: typeof s.escopoAplicacao === "string" ? s.escopoAplicacao : null,
  };
}

function parseInlineActions(raw: unknown): InlineLibraryAction[] {
  if (!Array.isArray(raw)) return [];
  const out: InlineLibraryAction[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const a = entry as Record<string, unknown>;
    const title = typeof a.title === "string" ? a.title.trim() : "";
    if (!title) continue;
    out.push({
      title,
      description: typeof a.description === "string" ? a.description : null,
      suggestedDeadlineDays:
        typeof a.suggestedDeadlineDays === "number" ? a.suggestedDeadlineDays : null,
      suggestedResponsibleArea:
        typeof a.suggestedResponsibleArea === "string" ? a.suggestedResponsibleArea : null,
      fundamentoTecnico: typeof a.fundamentoTecnico === "string" ? a.fundamentoTecnico : null,
      criterioConclusao: typeof a.criterioConclusao === "string" ? a.criterioConclusao : null,
    });
  }
  return out;
}

export function scenarioBindingHasRecommendation(slot: LibraryScenarioBinding | undefined): boolean {
  if (!slot) return false;
  const t = slot.recommendation?.title?.trim();
  return Boolean(slot.recommendationId || (t && t.length > 0));
}

function normalizeBindings(raw: unknown): LibraryBindings {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: LibraryBindings = {};
  for (const key of LIBRARY_SCENARIOS) {
    const scenario = obj[key];
    if (!scenario || typeof scenario !== "object") continue;
    const s = scenario as Record<string, unknown>;
    const actionIds = Array.isArray(s.actionIds)
      ? (s.actionIds.filter((v): v is string => typeof v === "string"))
      : [];
    const recommendation = parseInlineRecommendation(s.recommendation);
    const actions = parseInlineActions(s.actions);
    result[key] = {
      recommendationId: typeof s.recommendationId === "string" ? s.recommendationId : null,
      actionIds,
      recommendation: recommendation ?? undefined,
      actions: actions.length > 0 ? actions : undefined,
      note: typeof s.note === "string" ? s.note : null,
    };
  }
  return result;
}

const INLINE_METRIC_ANSWER_TYPES: InlineMetric["answerType"][] = [
  "yes_no",
  "scale",
  "numeric",
  "text",
];

const INLINE_METRIC_INTERPRETATIONS: InlineMetric["interpretation"][] = [
  "higher_better",
  "lower_better",
  "qualitative",
];

export function normalizeInlineMetric(raw: unknown): InlineMetric | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const name = typeof obj.name === "string" ? obj.name.trim() : "";
  let answerType = obj.answerType;
  const interpretation = obj.interpretation;
  if (!name) return null;
  if (answerType === "yes_no_partial") answerType = "yes_no";
  if (
    typeof answerType !== "string" ||
    !INLINE_METRIC_ANSWER_TYPES.includes(answerType as InlineMetric["answerType"])
  ) {
    return null;
  }
  if (
    typeof interpretation !== "string" ||
    !INLINE_METRIC_INTERPRETATIONS.includes(
      interpretation as InlineMetric["interpretation"],
    )
  ) {
    return null;
  }
  const description = typeof obj.description === "string" ? obj.description : null;
  return {
    name,
    description,
    answerType: answerType as InlineMetric["answerType"],
    interpretation: interpretation as InlineMetric["interpretation"],
  };
}

export function normalizeResponseMapping(raw: unknown): ResponseMapping {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const result: ResponseMapping = {};
  const sb = obj.scaleBands;
  if (sb && typeof sb === "object") {
    const s = sb as Record<string, unknown>;
    if (typeof s.failMax === "number" && typeof s.partialMax === "number" && s.failMax < s.partialMax) {
      result.scaleBands = { failMax: s.failMax, partialMax: s.partialMax };
    }
  }
  const nt = obj.numericThresholds;
  if (nt && typeof nt === "object") {
    const n = nt as Record<string, unknown>;
    if (
      typeof n.failBelow === "number" &&
      typeof n.partialBelow === "number" &&
      n.failBelow < n.partialBelow
    ) {
      result.numericThresholds = { failBelow: n.failBelow, partialBelow: n.partialBelow };
    }
  }
  return result;
}

function mapBinding(row: BindingRow): QuestionLibraryBinding {
  return {
    questionId: row.question_id,
    axisId: row.axis_id,
    sectionId: row.section_id,
    metricId: row.metric_id,
    metric: normalizeInlineMetric(row.metric),
    bindings: normalizeBindings(row.bindings),
    responseMapping: normalizeResponseMapping(row.response_mapping),
    coverageScore:
      typeof row.coverage_score === "string"
        ? Number.parseFloat(row.coverage_score)
        : Number(row.coverage_score ?? 0),
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

/**
 * Entrada deterministica usada para derivar o `hash` de um snapshot de
 * pergunta. Exporta-se separadamente para permitir testes unitarios sem
 * depender do Supabase.
 */
export function computeSnapshotHashInput(args: {
  axisVersionId: string | null;
  sectionVersionId: string | null;
  metric: QuestionLibraryBinding["metric"];
  recommendationVersionIds: string[];
  actionVersionIds: string[];
  bindings: LibraryBindings;
  responseMapping: ResponseMapping;
}) {
  return {
    axisVersionId: args.axisVersionId,
    sectionVersionId: args.sectionVersionId,
    metric: args.metric,
    recommendationVersionIds: args.recommendationVersionIds,
    actionVersionIds: args.actionVersionIds,
    bindings: args.bindings,
    responseMapping: args.responseMapping,
  };
}

export function computeSnapshotHash(
  input: ReturnType<typeof computeSnapshotHashInput>,
): string {
  return createHash("sha256").update(JSON.stringify(input)).digest("hex");
}

/**
 * Cobertura percentual dos cenarios obrigatorios. Se `options.answerType` for
 * informado, calcula os cenarios obrigatorios dinamicamente a partir do tipo
 * de resposta e de `requiresEvidence` (comportamento novo, alinhado a UI
 * simplificada). Sem options, cai no conjunto historico fixo para compat.
 */
export function computeCoverageScore(
  bindings: LibraryBindings,
  options?: {
    answerType?: InlineMetric["answerType"] | null;
    requiresEvidence?: boolean;
  },
): number {
  const required = options?.answerType
    ? getRequiredScenariosFor(options.answerType, options.requiresEvidence ?? false)
    : LIBRARY_REQUIRED_SCENARIOS;
  if (required.length === 0) return 100;
  const covered = required.filter((scenario) =>
    scenarioBindingHasRecommendation(bindings[scenario]),
  ).length;
  return Number(((covered / required.length) * 100).toFixed(2));
}

/**
 * Valida se o binding tem conteudo suficiente para publicacao. Os cenarios
 * obrigatorios sao derivados da combinacao (answerType, requiresEvidence) via
 * `getRequiredScenariosFor`. Se `requiresEvidence` nao for passado, assume-se
 * `true` (comportamento conservador: exige FAMI).
 */
export function validateBindingForPublish(
  binding: QuestionLibraryBinding,
  options?: { requiresEvidence?: boolean },
): { valid: boolean; missing: LibraryScenarioKey[] } {
  const requiresEvidence = options?.requiresEvidence ?? true;
  const missing: LibraryScenarioKey[] = [];
  const required = getRequiredScenariosFor(
    binding.metric?.answerType ?? null,
    requiresEvidence,
  );
  for (const scenario of required) {
    if (!scenarioBindingHasRecommendation(binding.bindings[scenario])) {
      missing.push(scenario);
    }
  }
  const hasInlineMetric = Boolean(
    binding.metric?.name && binding.metric?.answerType && binding.metric?.interpretation,
  );
  const hasAxisAndSection = Boolean(binding.axisId && binding.sectionId);
  return {
    valid: missing.length === 0 && hasAxisAndSection && hasInlineMetric,
    missing,
  };
}

/**
 * Deriva uma interpretacao padrao para o tipo de resposta escolhido. A UI
 * simplificada nao pede `interpretation` ao admin; usa-se `higher_better` para
 * escala/numerico (valores altos tendem a indicar atendimento) e
 * `qualitative` para tipos categoricos.
 */
function defaultInterpretationFor(
  answerType: InlineMetric["answerType"],
): InlineMetric["interpretation"] {
  return answerType === "scale" || answerType === "numeric"
    ? "higher_better"
    : "qualitative";
}

export class BindingService {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async getByQuestion(questionId: string): Promise<QuestionLibraryBinding | null> {
    const { data, error } = await this.supabase
      .from("question_library_binding")
      .select("*")
      .eq("question_id", questionId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapBinding(data as BindingRow) : null;
  }

  async upsert(
    questionId: string,
    input: unknown,
    actor: { userId?: string | null } = {},
  ): Promise<QuestionLibraryBinding> {
    const parsed = questionBindingInputSchema.safeParse(input);
    if (!parsed.success) {
      throw new LibraryValidationError(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "_",
          message: issue.message,
        })),
      );
    }
    const value: QuestionBindingInput = parsed.data;

    // Busca metadados da pergunta para preencher defaults e calcular cobertura
    // dinamica (requires_evidence) quando a UI simplificada nao envia metric
    // completa.
    const { data: questionRow, error: qErr } = await this.supabase
      .from("questions")
      .select("prompt, requires_evidence")
      .eq("id", questionId)
      .maybeSingle();
    if (qErr) throw qErr;
    const questionPrompt = (questionRow?.prompt as string | undefined) ?? "";
    const requiresEvidence = Boolean(questionRow?.requires_evidence);

    const metricPayload: InlineMetric | null = value.metric
      ? {
          name: value.metric.name?.trim() || questionPrompt || "Metrica",
          description: value.metric.description ?? null,
          answerType: value.metric.answerType,
          interpretation:
            value.metric.interpretation ??
            defaultInterpretationFor(value.metric.answerType),
        }
      : null;

    const coverage = computeCoverageScore(value.bindings as LibraryBindings, {
      answerType: metricPayload?.answerType ?? null,
      requiresEvidence,
    });
    const payload = {
      question_id: questionId,
      axis_id: value.axisId,
      section_id: value.sectionId,
      metric_id: null,
      metric: metricPayload ?? {},
      bindings: value.bindings,
      response_mapping: value.responseMapping,
      coverage_score: coverage,
      updated_by: actor.userId ?? null,
    };
    const { data, error } = await this.supabase
      .from("question_library_binding")
      .upsert(payload, { onConflict: "question_id" })
      .select("*")
      .single();
    if (error) throw error;
    logInfo("library.question.binding_saved", {
      questionId,
      coverage,
      actorUserId: actor.userId ?? null,
    });
    return mapBinding(data as BindingRow);
  }

  async listMissingForForm(formId: string): Promise<
    Array<{
      questionId: string;
      missing: LibraryScenarioKey[];
    }>
  > {
    const { data: questions, error: qErr } = await this.supabase
      .from("form_questions")
      .select("question_id")
      .eq("form_id", formId);
    if (qErr) throw qErr;
    const ids = (questions ?? []).map((row) => row.question_id as string);
    if (ids.length === 0) return [];

    const { data: questionRows, error: qRowsErr } = await this.supabase
      .from("questions")
      .select("id, requires_evidence")
      .in("id", ids);
    if (qRowsErr) throw qRowsErr;
    const requiresEvidenceById = new Map<string, boolean>();
    for (const row of questionRows ?? []) {
      requiresEvidenceById.set(
        row.id as string,
        Boolean(row.requires_evidence),
      );
    }

    const { data: bindings, error: bErr } = await this.supabase
      .from("question_library_binding")
      .select("*")
      .in("question_id", ids);
    if (bErr) throw bErr;

    const byId = new Map<string, QuestionLibraryBinding>();
    for (const row of bindings ?? []) {
      const mapped = mapBinding(row as BindingRow);
      byId.set(mapped.questionId, mapped);
    }

    const missing: Array<{ questionId: string; missing: LibraryScenarioKey[] }> = [];
    for (const id of ids) {
      const requiresEvidence = requiresEvidenceById.get(id) ?? true;
      const existing = byId.get(id);
      if (!existing) {
        // Sem binding: pendencia minima alinhada ao padrao Sim/Nao (+ FAMI se exige evidencia).
        missing.push({
          questionId: id,
          missing: getRequiredScenariosFor("yes_no", requiresEvidence),
        });
        continue;
      }
      const check = validateBindingForPublish(existing, { requiresEvidence });
      if (!check.valid) {
        missing.push({ questionId: id, missing: check.missing });
      }
    }
    return missing;
  }
}

export class SnapshotService {
  private supabase: Client;
  private repo: LibraryRepository;

  constructor(client?: Client, repo?: LibraryRepository) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
    this.repo = repo ?? new LibraryRepository(this.supabase);
  }

  async captureForForm(params: {
    formId: string;
    formVersion: number;
  }): Promise<{ captured: number; snapshots: FormQuestionLibrarySnapshot[] }> {
    const { data: questions, error: qErr } = await this.supabase
      .from("form_questions")
      .select("question_id")
      .eq("form_id", params.formId);
    if (qErr) throw qErr;

    const ids = (questions ?? []).map((row) => row.question_id as string);
    if (ids.length === 0) {
      return { captured: 0, snapshots: [] };
    }

    const { data: bindings, error: bErr } = await this.supabase
      .from("question_library_binding")
      .select("*")
      .in("question_id", ids);
    if (bErr) throw bErr;

    const mappedBindings = (bindings ?? []).map((row) => mapBinding(row as BindingRow));

    const axisIds: string[] = [];
    const sectionIds: string[] = [];
    const recommendationIds: string[] = [];
    const actionIds: string[] = [];

    for (const binding of mappedBindings) {
      if (binding.axisId) axisIds.push(binding.axisId);
      if (binding.sectionId) sectionIds.push(binding.sectionId);
      for (const scenario of LIBRARY_SCENARIOS) {
        const slot = binding.bindings[scenario];
        if (!slot) continue;
        if (slot.recommendationId) recommendationIds.push(slot.recommendationId);
        for (const aId of slot.actionIds) actionIds.push(aId);
      }
    }

    const [axisMap, sectionMap, recommendationMap, actionMap] = await Promise.all([
      this.repo.findLatestVersionsByItemIds("axis", axisIds),
      this.repo.findLatestVersionsByItemIds("section", sectionIds),
      this.repo.findLatestVersionsByItemIds("recommendation", recommendationIds),
      this.repo.findLatestVersionsByItemIds("action", actionIds),
    ]);

    const resolved: FormQuestionLibrarySnapshot[] = [];
    for (const binding of mappedBindings) {
      const axisVersion = binding.axisId ? axisMap.get(binding.axisId) ?? null : null;
      const sectionVersion = binding.sectionId ? sectionMap.get(binding.sectionId) ?? null : null;

      const recommendationVersionIds: string[] = [];
      const actionVersionIds: string[] = [];
      for (const scenario of LIBRARY_SCENARIOS) {
        const slot = binding.bindings[scenario];
        if (!slot) continue;
        if (slot.recommendationId) {
          const ver = recommendationMap.get(slot.recommendationId);
          if (ver) recommendationVersionIds.push(ver.id);
        }
        for (const actionId of slot.actionIds) {
          const ver = actionMap.get(actionId);
          if (ver) actionVersionIds.push(ver.id);
        }
      }

      const hashInput = computeSnapshotHashInput({
        axisVersionId: axisVersion?.id ?? null,
        sectionVersionId: sectionVersion?.id ?? null,
        metric: binding.metric,
        recommendationVersionIds,
        actionVersionIds,
        bindings: binding.bindings,
        responseMapping: binding.responseMapping,
      });
      const hash = computeSnapshotHash(hashInput);

      const snapshot: FormQuestionLibrarySnapshot = {
        formId: params.formId,
        formVersion: params.formVersion,
        questionId: binding.questionId,
        axisVersionId: axisVersion?.id ?? null,
        sectionVersionId: sectionVersion?.id ?? null,
        metricVersionId: null,
        metric: binding.metric,
        recommendationVersionIds,
        actionVersionIds,
        bindings: binding.bindings,
        responseMapping: binding.responseMapping,
        capturedAt: new Date().toISOString(),
        hash,
      };
      resolved.push(snapshot);
    }

    if (resolved.length > 0) {
      const { error } = await this.supabase
        .from("form_question_library_snapshot")
        .upsert(
          resolved.map((s) => ({
            form_id: s.formId,
            form_version: s.formVersion,
            question_id: s.questionId,
            axis_version_id: s.axisVersionId,
            section_version_id: s.sectionVersionId,
            metric_version_id: s.metricVersionId,
            metric: s.metric ?? {},
            recommendation_version_ids: s.recommendationVersionIds,
            action_version_ids: s.actionVersionIds,
            bindings: s.bindings,
            response_mapping: s.responseMapping,
            captured_at: s.capturedAt,
            hash: s.hash,
          })),
          { onConflict: "form_id,form_version,question_id" },
        );
      if (error) throw error;
    }

    logInfo("library.form.snapshot_captured", {
      formId: params.formId,
      formVersion: params.formVersion,
      captured: resolved.length,
    });

    return { captured: resolved.length, snapshots: resolved };
  }

  async getSnapshotForQuestion(
    formId: string,
    formVersion: number,
    questionId: string,
  ): Promise<FormQuestionLibrarySnapshot | null> {
    const { data, error } = await this.supabase
      .from("form_question_library_snapshot")
      .select("*")
      .eq("form_id", formId)
      .eq("form_version", formVersion)
      .eq("question_id", questionId)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    const row = data as {
      form_id: string;
      form_version: number;
      question_id: string;
      axis_version_id: string | null;
      section_version_id: string | null;
      metric_version_id: string | null;
      metric?: unknown;
      recommendation_version_ids: string[] | null;
      action_version_ids: string[] | null;
      bindings: unknown;
      response_mapping?: unknown;
      captured_at: string;
      hash: string;
    };
    return {
      formId: row.form_id,
      formVersion: row.form_version,
      questionId: row.question_id,
      axisVersionId: row.axis_version_id,
      sectionVersionId: row.section_version_id,
      metricVersionId: row.metric_version_id,
      metric: normalizeInlineMetric(row.metric),
      recommendationVersionIds: row.recommendation_version_ids ?? [],
      actionVersionIds: row.action_version_ids ?? [],
      bindings: normalizeBindings(row.bindings),
      responseMapping: normalizeResponseMapping(row.response_mapping),
      capturedAt: row.captured_at,
      hash: row.hash,
    };
  }
}
