import type { SupabaseClient } from "@supabase/supabase-js";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import {
  fetchQuestionStructures,
  type ResolvedQuestionStructure,
} from "@/lib/workbench/resolve-question-structure";

/** Ordem de exibicao dos eixos estruturais (tabela `axes`). */
export const STRUCTURAL_AXIS_ORDER = ["Governanca", "Ambiental", "Social"] as const;

export type ActionPlanAction = {
  id: string;
  actionText: string;
  dueDate: string;
  responsibleSector: string;
  responsibleName: string;
  status: PlanStatus;
  observations: string | null;
  updatedAt: string;
  slaLabel: "ok" | "due_soon" | "overdue" | "na";
};

export type ActionPlanRecommendationNode = {
  recommendationId: string;
  recommendationText: string;
  recommendationType: string;
  recommendationStatus: RecommendationStatus;
  questionPrompt: string;
  sectionName: string;
  actions: ActionPlanAction[];
};

export type ActionPlanAxisNode = {
  axisId: string;
  axisName: string;
  recommendations: ActionPlanRecommendationNode[];
};

export type ActionPlanByFormSummary = {
  totalRecommendations: number;
  recommendationsWithActions: number;
  totalActions: number;
  actionsByStatus: Partial<Record<PlanStatus, number>>;
};

export type ActionPlanByFormPayload = {
  formId: string;
  formName: string;
  formVersion: number;
  organizationId: string;
  organizationName: string;
  axes: ActionPlanAxisNode[];
  summary: ActionPlanByFormSummary;
};

export type RecommendationWithPlansRow = {
  id: string;
  form_id: string;
  organization_id: string;
  recommendation_type: string;
  current_text: string;
  status: RecommendationStatus;
  question_id?: string;
  questions: QuestionJoinLike | QuestionJoinLike[] | null;
  action_plans: ActionPlanRaw[] | ActionPlanRaw[] | null;
};

export type QuestionJoinLike = {
  id?: string;
  prompt: string;
  section_id?: string | null;
  sections:
    | { name: string; axes: AxisJoinLike | AxisJoinLike[] | null }
    | { name: string; axes: AxisJoinLike | AxisJoinLike[] | null }[]
    | null;
};

type AxisJoinLike = { id: string; name: string } | { id: string; name: string }[];

type ActionPlanRaw = {
  id: string;
  action_text?: string | null;
  due_date?: string | null;
  responsible_sector?: string | null;
  responsible_name?: string | null;
  status?: PlanStatus | null;
  observations?: string | null;
  updated_at?: string | null;
};

export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function normalizeAxis(axis: AxisJoinLike | null): { id: string; name: string } | null {
  if (!axis) return null;
  const row = Array.isArray(axis) ? axis[0] : axis;
  if (!row?.id) return null;
  return { id: String(row.id), name: String(row.name ?? "") };
}

export function computeActionSla(plan: {
  dueDate: string;
  status: PlanStatus;
}): "ok" | "due_soon" | "overdue" | "na" {
  if (!plan.dueDate) return "na";
  if (plan.status === "completed" || plan.status === "cancelled") return "na";
  const due = plan.dueDate.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  const week = addDaysISODate(7);
  if (due < today) return "overdue";
  if (due <= week) return "due_soon";
  return "ok";
}

function addDaysISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function aggregateSlaFromActions(
  actions: Pick<ActionPlanAction, "slaLabel">[],
): "ok" | "due_soon" | "overdue" | "na" {
  if (actions.length === 0) return "na";
  if (actions.some((a) => a.slaLabel === "overdue")) return "overdue";
  if (actions.some((a) => a.slaLabel === "due_soon")) return "due_soon";
  if (actions.some((a) => a.slaLabel === "ok")) return "ok";
  return "na";
}

function rawPlanToAction(row: ActionPlanRaw): ActionPlanAction {
  const dueDate = String(row.due_date ?? "").slice(0, 10);
  const status = (row.status ?? "to_implement") as PlanStatus;
  const action: ActionPlanAction = {
    id: String(row.id),
    actionText: String(row.action_text ?? ""),
    dueDate,
    responsibleSector: String(row.responsible_sector ?? ""),
    responsibleName: String(row.responsible_name ?? ""),
    status,
    observations: (row.observations as string | null) ?? null,
    updatedAt: String(row.updated_at ?? ""),
    slaLabel: "na",
  };
  action.slaLabel = computeActionSla(action);
  return action;
}

function normalizePlans(raw: unknown): ActionPlanRaw[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((x) => x && typeof x === "object" && "id" in (x as object)) as ActionPlanRaw[];
  return [raw as ActionPlanRaw].filter((x) => x?.id);
}

function axisSortKey(name: string): number {
  const idx = STRUCTURAL_AXIS_ORDER.indexOf(name as (typeof STRUCTURAL_AXIS_ORDER)[number]);
  return idx >= 0 ? idx : STRUCTURAL_AXIS_ORDER.length;
}

/**
 * Agrupa recomendacoes + acoes por eixo estrutural.
 */
export function buildActionPlanByFormPayload(params: {
  formId: string;
  formName: string;
  formVersion: number;
  organizationId: string;
  organizationName: string;
  recommendationRows: RecommendationWithPlansRow[];
  /** Eixo/secao resolvidos (Biblioteca ou legado), por `question_id`. */
  structuresByQuestion?: Map<string, ResolvedQuestionStructure>;
}): ActionPlanByFormPayload {
  const axesMap = new Map<
    string,
    { axisId: string; axisName: string; recs: Map<string, ActionPlanRecommendationNode> }
  >();

  const actionsByStatus: Partial<Record<PlanStatus, number>> = {};
  let totalActions = 0;
  let recommendationsWithActions = 0;

  for (const row of params.recommendationRows) {
    const q = pickOne(row.questions as QuestionJoinLike | QuestionJoinLike[] | null);
    const sec = q ? pickOne(q.sections) : null;
    const axisRow = sec ? normalizeAxis(sec.axes as AxisJoinLike | null) : null;
    const questionId = row.question_id ?? q?.id;
    const structure = questionId ? params.structuresByQuestion?.get(questionId) : undefined;
    const structuralAxisId = structure?.structuralAxisId ?? null;
    const axisKey = structuralAxisId ?? "__sem_eixo";
    const axisName = structure?.axisName || axisRow?.name || "";

    let bucket = axesMap.get(axisKey);
    if (!bucket) {
      bucket = { axisId: structuralAxisId ?? "", axisName, recs: new Map() };
      axesMap.set(axisKey, bucket);
    }

    const plansSorted = normalizePlans(row.action_plans)
      .map(rawPlanToAction)
      .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

    if (plansSorted.length > 0) recommendationsWithActions += 1;
    for (const ac of plansSorted) {
      totalActions += 1;
      actionsByStatus[ac.status] = (actionsByStatus[ac.status] ?? 0) + 1;
    }

    bucket.recs.set(row.id, {
      recommendationId: row.id,
      recommendationText: row.current_text,
      recommendationType: row.recommendation_type,
      recommendationStatus: row.status,
      questionPrompt: q?.prompt ?? "(pergunta removida)",
      sectionName: structure?.sectionName || sec?.name || "",
      actions: plansSorted,
    });
  }

  const axes: ActionPlanAxisNode[] = Array.from(axesMap.values())
    .map((b) => ({
      axisId: b.axisId === "__sem_eixo" ? "" : b.axisId,
      axisName: b.axisName || "(sem eixo)",
      recommendations: Array.from(b.recs.values()).sort((x, y) =>
        x.recommendationText.localeCompare(y.recommendationText, "pt-BR"),
      ),
    }))
    .sort((a, b) => axisSortKey(a.axisName || "") - axisSortKey(b.axisName || "") || a.axisName.localeCompare(b.axisName, "pt-BR"));

  return {
    formId: params.formId,
    formName: params.formName,
    formVersion: params.formVersion,
    organizationId: params.organizationId,
    organizationName: params.organizationName,
    axes,
    summary: {
      totalRecommendations: params.recommendationRows.length,
      recommendationsWithActions,
      totalActions,
      actionsByStatus,
    },
  };
}

/**
 * Resolve eixo estrutural (`axes.id`) para uma recomendação existente.
 * A origem única da verdade é `fetchQuestionStructures` (biblioteca + formulário, catálogo `axes`).
 */
export async function resolveAxisIdForRecommendation(
  client: SupabaseClient,
  recommendationId: string,
): Promise<string | null> {
  const { data: rec } = await client
    .from("recommendations")
    .select("question_id")
    .eq("id", recommendationId)
    .maybeSingle();
  const questionId = rec?.question_id as string | undefined;
  if (!questionId) return null;

  const structures = await fetchQuestionStructures(client, [questionId]);
  return structures.get(questionId)?.structuralAxisId ?? null;
}

export function assertRecommendationBelongsToForm(recommendationFormId: string, formId: string) {
  if (recommendationFormId !== formId) {
    throw new Error("Formulario inconsistente com a recomendacao.");
  }
}
