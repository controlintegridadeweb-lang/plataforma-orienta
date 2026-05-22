import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { displayNameFromProfile } from "@/lib/auth/profile-types";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logInfo } from "@/lib/observability/logger";
import type { AppRole } from "@/lib/api/auth";
import { reprocessFormForOrganization } from "@/lib/supabase/workflows";
import {
  fetchQuestionStructures,
  questionIdsForAxisFilter,
} from "@/lib/workbench/resolve-question-structure";
import {
  listRecommendationsQuerySchema,
  regenerateRecommendationsSchema,
  updateRecommendationSchema,
  type RecommendationStatus,
} from "./schemas";

type Client = SupabaseClient;

type Caller = { role: AppRole; organizationId: string | null };

/**
 * Regenerador injetavel para tornar a classe testavel. Em producao delega
 * para o workflow v1 existente (`reprocessFormForOrganization`) que faz
 * DELETE+INSERT na tabela `recommendations`.
 */
export type RegenerateFn = (
  formId: string,
  organizationId: string,
) => Promise<{
  processingVersion: number;
  recommendationsCreated: number;
  fami: unknown;
}>;

// -- Erros ----------------------------------------------------------------

export class RecommendationsValidationError extends Error {
  issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super("Dados invalidos para recomendacao.");
    this.name = "RecommendationsValidationError";
    this.issues = issues;
  }
}

export class RecommendationsNotFoundError extends Error {
  constructor(message = "Recomendacao nao encontrada.") {
    super(message);
    this.name = "RecommendationsNotFoundError";
  }
}

export class RecommendationsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecommendationsConflictError";
  }
}

// -- Tipos de saida ------------------------------------------------------

export type RecommendationListItem = {
  id: string;
  formId: string;
  formName: string;
  formVersion: number;
  organizationId: string;
  organizationName: string;
  questionId: string;
  questionPrompt: string;
  sectionName: string;
  axisName: string;
  recommendationType: string;
  originalText: string;
  currentText: string;
  status: RecommendationStatus;
  createdAt: string;
  updatedAt: string;
  /** Indica se já existe plano de ação vinculado (para links na UI). */
  hasActionPlan: boolean;
};

export type RecommendationsListResult = {
  items: RecommendationListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type RecommendationChangeEntry = {
  id: string;
  recommendationId: string;
  field: "status" | "current_text";
  oldValue: string | null;
  newValue: string | null;
  comment: string | null;
  changedBy: string;
  changedByName: string | null;
  changedAt: string;
};

export type RecommendationFilterOptions = {
  forms: { id: string; name: string; version: number }[];
  organizations: { id: string; name: string }[];
  /** Eixos estruturais (`axes`) para filtro por recomendações ligadas a perguntas desses eixos. */
  axes: { id: string; name: string }[];
  types: string[];
  statuses: RecommendationStatus[];
};

export type RecommendationUpdateResult = {
  item: RecommendationListItem;
  changes: RecommendationChangeEntry[];
};

export type RecommendationRegenerateResult = {
  processingVersion: number;
  recommendationsCreated: number;
  warning: string;
};

// -- Rows brutas ---------------------------------------------------------

type RecommendationRowRaw = {
  id: string;
  form_id: string;
  organization_id: string;
  question_id: string;
  recommendation_type: string;
  original_text: string;
  current_text: string;
  status: RecommendationStatus;
  created_at: string;
  updated_at: string;
  questions: unknown;
  forms: unknown;
  organizations: unknown;
  action_plans?: unknown;
};

type FormRow = { id: string; name: string; version: number };
type OrgRow = { id: string; name: string };
type QuestionJoin = {
  id: string;
  prompt: string;
  section_id: string;
  sections:
    | { name: string; axes: { name: string } | { name: string }[] | null }
    | { name: string; axes: { name: string } | { name: string }[] | null }[]
    | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

// -- Service ------------------------------------------------------------

/**
 * Fila operacional de recomendacoes no admin.
 *
 * Leitura: join em SQL (via PostgREST) com `questions/sections/axes`,
 * `forms`, `organizations` e paginacao via `range`. Escrita: atualiza
 * `recommendations` e grava uma linha em `recommendation_changes` por
 * campo efetivamente modificado (preserva `original_text`).
 */
export class RecommendationsAdminService {
  private supabase: Client;
  private regenerate: RegenerateFn;

  constructor(client?: Client, regenerate?: RegenerateFn) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
    this.regenerate = regenerate ?? reprocessFormForOrganization;
  }

  // -- Listagem ---------------------------------------------------------

  async list(
    rawQuery: unknown,
    caller: Caller,
  ): Promise<RecommendationsListResult> {
    const query = this.parse(listRecommendationsQuerySchema, rawQuery);

    const effectiveOrgId =
      caller.role === "admin"
        ? query.organizationId
        : caller.organizationId ?? "__none__";

    // Importante: NAO usar `sections!inner` aqui. Perguntas criadas pelo fluxo
    // novo (Biblioteca) tem `questions.section_id = NULL` — nome de eixo/secao
    // vem do vinculo da Biblioteca. Inner join filtraria essas recomendacoes da
    // listagem.
    let req = this.supabase
      .from("recommendations")
      .select(
        `id, form_id, organization_id, question_id, recommendation_type,
         original_text, current_text, status, created_at, updated_at,
         questions:questions!inner(id, prompt, section_id, sections(name, axes(name))),
         forms:forms!inner(id, name, version),
         organizations:organizations!inner(id, name),
         action_plans:action_plans(id)`,
        { count: "exact" },
      )
      .order("created_at", { ascending: false });

    if (effectiveOrgId) req = req.eq("organization_id", effectiveOrgId);
    if (query.recommendationId) {
      req = req.eq("id", query.recommendationId);
    } else if (query.axisId) {
      const questionIds = await questionIdsForAxisFilter(this.supabase, query.axisId);
      if (questionIds.length === 0) {
        return {
          items: [],
          total: 0,
          limit: query.limit,
          offset: query.offset,
        };
      }
      req = req.in("question_id", questionIds);
    }
    if (query.formId) req = req.eq("form_id", query.formId);
    if (query.status) req = req.eq("status", query.status);
    if (query.type) req = req.eq("recommendation_type", query.type);

    const from = query.offset;
    const to = query.offset + query.limit - 1;
    req = req.range(from, to);

    const { data, error, count } = await req;
    if (error) throw error;

    const rows = (data ?? []) as unknown as RecommendationRowRaw[];
    const structures = await fetchQuestionStructures(
      this.supabase,
      rows.map((row) => row.question_id),
    );
    const items = rows.map((row) => this.toListItem(row, structures.get(row.question_id)));

    return {
      items,
      total: count ?? items.length,
      limit: query.limit,
      offset: query.offset,
    };
  }

  async get(
    recommendationId: string,
    caller: Caller,
  ): Promise<RecommendationListItem> {
    const row = await this.fetchRowWithJoin(recommendationId);
    this.enforceOrgScope(caller, row.organization_id);
    const structures = await fetchQuestionStructures(this.supabase, [row.question_id]);
    return this.toListItem(row, structures.get(row.question_id));
  }

  // -- Update com auditoria ---------------------------------------------

  async update(
    recommendationId: string,
    rawPayload: unknown,
    actorUserId: string,
    caller: Caller,
  ): Promise<RecommendationUpdateResult> {
    const payload = this.parse(updateRecommendationSchema, rawPayload);

    // Estado atual para calcular o diff.
    const { data: current, error: fetchErr } = await this.supabase
      .from("recommendations")
      .select("id, organization_id, status, current_text")
      .eq("id", recommendationId)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!current) throw new RecommendationsNotFoundError();
    this.enforceOrgScope(caller, current.organization_id as string);

    const diff: Array<{
      field: "status" | "current_text";
      oldValue: string;
      newValue: string;
    }> = [];

    const updates: Record<string, unknown> = {};
    if (payload.status !== undefined && payload.status !== current.status) {
      diff.push({
        field: "status",
        oldValue: String(current.status),
        newValue: payload.status,
      });
      updates.status = payload.status;
    }
    if (
      payload.currentText !== undefined &&
      payload.currentText !== current.current_text
    ) {
      diff.push({
        field: "current_text",
        oldValue: String(current.current_text ?? ""),
        newValue: payload.currentText,
      });
      updates.current_text = payload.currentText;
    }

    if (diff.length > 0) {
      updates.updated_at = new Date().toISOString();
      const { error: updateErr } = await this.supabase
        .from("recommendations")
        .update(updates)
        .eq("id", recommendationId);
      if (updateErr) throw updateErr;

      const commentValue =
        payload.comment && payload.comment.length > 0 ? payload.comment : null;
      const rowsToInsert = diff.map((d) => ({
        recommendation_id: recommendationId,
        changed_by: actorUserId,
        field: d.field,
        old_value: d.oldValue,
        new_value: d.newValue,
        comment: commentValue,
      }));
      const { data: inserted, error: insertErr } = await this.supabase
        .from("recommendation_changes")
        .insert(rowsToInsert)
        .select("id, recommendation_id, field, old_value, new_value, comment, changed_by, changed_at");
      if (insertErr) throw insertErr;

      logInfo("recommendations.admin.updated", {
        recommendationId,
        actorUserId,
        fields: diff.map((d) => d.field),
      });

      const changes = (inserted ?? []).map((r) => this.toChangeEntry(r));
      const updated = await this.fetchRowWithJoin(recommendationId);
      return { item: this.toListItem(updated), changes };
    }

    // Nenhuma mudanca efetiva: retorna a linha como esta.
    const unchanged = await this.fetchRowWithJoin(recommendationId);
    return { item: this.toListItem(unchanged), changes: [] };
  }

  // -- Historico --------------------------------------------------------

  async listHistory(
    recommendationId: string,
    caller: Caller,
  ): Promise<RecommendationChangeEntry[]> {
    // Garante que a recomendacao existe e pertence ao escopo do caller.
    const { data: rec, error: recErr } = await this.supabase
      .from("recommendations")
      .select("id, organization_id")
      .eq("id", recommendationId)
      .maybeSingle();
    if (recErr) throw recErr;
    if (!rec) throw new RecommendationsNotFoundError();
    this.enforceOrgScope(caller, rec.organization_id as string);

    const { data, error } = await this.supabase
      .from("recommendation_changes")
      .select("id, recommendation_id, field, old_value, new_value, comment, changed_by, changed_at")
      .eq("recommendation_id", recommendationId)
      .order("changed_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as Array<Record<string, unknown>>;
    const actorIds = Array.from(
      new Set(rows.map((r) => String(r.changed_by)).filter(Boolean)),
    );

    const nameById = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: profiles, error: profilesErr } = await this.supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", actorIds);
      if (profilesErr) throw profilesErr;

      for (const p of profiles ?? []) {
        const userId = p.user_id as string;
        const fullName = (p.full_name as string | null) ?? null;
        if (!fullName?.trim()) continue;
        nameById.set(userId, displayNameFromProfile(fullName, null));
      }
    }

    return rows.map((r) =>
      this.toChangeEntry(r, nameById.get(String(r.changed_by)) ?? null),
    );
  }

  // -- Regenerate -------------------------------------------------------

  async regenerateForForm(
    rawPayload: unknown,
    caller: Caller,
  ): Promise<RecommendationRegenerateResult> {
    const payload = this.parse(regenerateRecommendationsSchema, rawPayload);
    if (caller.role !== "admin") {
      if (!caller.organizationId || caller.organizationId !== payload.organizationId) {
        throw new RecommendationsConflictError(
          "Analyst so pode regenerar recomendacoes da propria organizacao.",
        );
      }
    }
    const result = await this.regenerate(payload.formId, payload.organizationId);
    logInfo("recommendations.admin.regenerated", {
      formId: payload.formId,
      organizationId: payload.organizationId,
      recommendationsCreated: result.recommendationsCreated,
    });
    return {
      processingVersion: result.processingVersion,
      recommendationsCreated: result.recommendationsCreated,
      warning:
        "Regeneracao substitui textos editados pela versao padrao da biblioteca.",
    };
  }

  // -- Filtros ---------------------------------------------------------

  async listFilterOptions(caller: Caller): Promise<RecommendationFilterOptions> {
    const { data: axesRows, error: axesErr } = await this.supabase
      .from("axes")
      .select("id, name")
      .order("name", { ascending: true });
    if (axesErr) throw axesErr;
    const axesList = ((axesRows ?? []) as Array<{ id: string; name: string }>).map((a) => ({
      id: a.id as string,
      name: a.name as string,
    }));

    const { data: formsData, error: formsErr } = await this.supabase
      .from("forms")
      .select("id, name, version, archived_at")
      .is("archived_at", null)
      .order("name", { ascending: true });
    if (formsErr) throw formsErr;

    let orgsQuery = this.supabase
      .from("organizations")
      .select("id, name")
      .order("name", { ascending: true });
    if (caller.role !== "admin") {
      if (!caller.organizationId) {
        return {
          forms: ((formsData ?? []) as FormRow[]).map((f) => ({
            id: f.id,
            name: f.name,
            version: f.version,
          })),
          organizations: [],
          axes: axesList,
          types: [],
          statuses: ["open", "in_progress", "resolved", "dismissed"],
        };
      }
      orgsQuery = orgsQuery.eq("id", caller.organizationId);
    }
    const { data: orgsData, error: orgsErr } = await orgsQuery;
    if (orgsErr) throw orgsErr;

    let typesQuery = this.supabase
      .from("recommendations")
      .select("recommendation_type");
    if (caller.role !== "admin" && caller.organizationId) {
      typesQuery = typesQuery.eq("organization_id", caller.organizationId);
    }
    const { data: typesRows, error: typesErr } = await typesQuery;
    if (typesErr) throw typesErr;
    const types = Array.from(
      new Set(
        ((typesRows ?? []) as Array<{ recommendation_type: string | null }>)
          .map((r) => r.recommendation_type)
          .filter((v): v is string => Boolean(v)),
      ),
    ).sort();

    return {
      forms: ((formsData ?? []) as FormRow[]).map((f) => ({
        id: f.id,
        name: f.name,
        version: f.version,
      })),
      organizations: (orgsData ?? []) as OrgRow[],
      axes: axesList,
      types,
      statuses: ["open", "in_progress", "resolved", "dismissed"],
    };
  }

  // -- Internos --------------------------------------------------------

  private normalizeActionPlans(raw: unknown): { id: string }[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw as { id: string }[];
    return [raw as { id: string }];
  }

  private parse<T>(schema: ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.map((p) => String(p)).join(".") || "_",
        message: i.message,
      }));
      throw new RecommendationsValidationError(
        issues.length > 0 ? issues : [{ path: "_", message: "Dados invalidos." }],
      );
    }
    return parsed.data;
  }

  private enforceOrgScope(caller: Caller, rowOrganizationId: string) {
    if (caller.role === "admin") return;
    if (!caller.organizationId || caller.organizationId !== rowOrganizationId) {
      throw new RecommendationsNotFoundError();
    }
  }

  private async fetchRowWithJoin(
    recommendationId: string,
  ): Promise<RecommendationRowRaw> {
    const { data, error } = await this.supabase
      .from("recommendations")
      .select(
        `id, form_id, organization_id, question_id, recommendation_type,
         original_text, current_text, status, created_at, updated_at,
         questions:questions!inner(id, prompt, section_id, sections(name, axes(name))),
         forms:forms!inner(id, name, version),
         organizations:organizations!inner(id, name),
         action_plans:action_plans(id)`,
      )
      .eq("id", recommendationId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new RecommendationsNotFoundError();
    return data as unknown as RecommendationRowRaw;
  }

  private toListItem(
    row: RecommendationRowRaw,
    structure?: { axisName: string; sectionName: string },
  ): RecommendationListItem {
    const form = pickOne(row.forms as FormRow | FormRow[] | null);
    const org = pickOne(row.organizations as OrgRow | OrgRow[] | null);
    const question = pickOne(row.questions as QuestionJoin | QuestionJoin[] | null);
    const section = question ? pickOne(question.sections) : null;
    const axis = section ? pickOne(section.axes) : null;
    return {
      id: row.id,
      formId: row.form_id,
      formName: form?.name ?? "(formulario removido)",
      formVersion: form?.version ?? 0,
      organizationId: row.organization_id,
      organizationName: org?.name ?? "(org removida)",
      questionId: row.question_id,
      questionPrompt: question?.prompt ?? "(pergunta removida)",
      sectionName: structure?.sectionName || section?.name || "",
      axisName: structure?.axisName || axis?.name || "",
      recommendationType: row.recommendation_type,
      originalText: row.original_text,
      currentText: row.current_text,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      hasActionPlan: this.normalizeActionPlans(row.action_plans).length > 0,
    };
  }

  private toChangeEntry(
    row: Record<string, unknown>,
    actorName?: string | null,
  ): RecommendationChangeEntry {
    return {
      id: String(row.id),
      recommendationId: String(row.recommendation_id),
      field: row.field as "status" | "current_text",
      oldValue: (row.old_value as string | null) ?? null,
      newValue: (row.new_value as string | null) ?? null,
      comment: (row.comment as string | null) ?? null,
      changedBy: String(row.changed_by),
      changedByName: actorName ?? null,
      changedAt: String(row.changed_at),
    };
  }
}
