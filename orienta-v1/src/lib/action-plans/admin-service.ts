/**
 * Lista e persiste planos de acao (acoes por recomendacao).
 * Multiplas acoes por recomendacao permitidas desde 0023.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import {
  assertRecommendationBelongsToForm,
  aggregateSlaFromActions,
  buildActionPlanByFormPayload,
  computeActionSla,
  resolveAxisIdForRecommendation,
  type ActionPlanAction,
  type ActionPlanByFormPayload,
  type RecommendationWithPlansRow,
  pickOne,
} from "@/lib/domain/action-plans";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AppRole } from "@/lib/api/auth";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { logInfo } from "@/lib/observability/logger";
import { fetchQuestionStructures } from "@/lib/workbench/resolve-question-structure";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import {
  actionPlanMetricsQuerySchema,
  createSupervisionNoteSchema,
  listActionPlansQuerySchema,
  listSupervisionNotesQuerySchema,
  saveActionPlanSchema,
  type ActionPlanListView,
} from "./schemas";
import { displayNameFromProfile } from "@/lib/auth/profile-types";

type Client = SupabaseClient;
type Caller = { role: AppRole; organizationId: string | null };

/** Mensagem técnica para admin (quem corrige vínculos). */
const STAFF_AXIS_UNRESOLVED_MESSAGE =
  "Nao foi possivel resolver eixo estrutural para esta recomendacao (vincule pergunta a secao ou biblioteca).";

/** Mensagem para respondente (sem linguagem de configuração técnica). */
const RESPONDENT_AXIS_UNRESOLVED_MESSAGE =
  "Não foi possível salvar a ação porque esta recomendação ainda não está corretamente associada a um eixo no sistema. Isso é configurado pela administração (pergunta, seção e biblioteca). Entre em contato informando que não foi possível registrar o plano de ação para esta recomendação.";

export type { ActionPlanByFormPayload };

export class ActionPlansValidationError extends Error {
  issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super("Dados invalidos para plano de acao.");
    this.name = "ActionPlansValidationError";
    this.issues = issues;
  }
}

export class ActionPlansNotFoundError extends Error {
  constructor(message = "Plano ou recomendacao nao encontrado.") {
    super(message);
    this.name = "ActionPlansNotFoundError";
  }
}

export type ActionPlanListItem = {
  recommendationId: string;
  questionId: string;
  formId: string;
  formName: string;
  formVersion: number;
  organizationId: string;
  organizationName: string;
  questionPrompt: string;
  sectionName: string;
  axisName: string;
  recommendationType: string;
  recommendationText: string;
  recommendationStatus: RecommendationStatus;
  plans: ActionPlanAction[];
  slaLabel: "ok" | "due_soon" | "overdue" | "na";
  /** Data de criação da recomendação no banco (quando disponível na listagem). */
  recommendationCreatedAt?: string;
  /**
   * Linhas sintéticas geradas pelo `expandActionPlanListRows`: total de ações na recomendação
   * antes de expandir (útil para badge “ação 1/N” na UI).
   */
  recommendationActionCount?: number;
};

export type ActionPlansListResult = {
  items: ActionPlanListItem[];
  total: number;
  limit: number;
  offset: number;
  view: ActionPlanListView;
};

export type ActionPlanMetrics = {
  totalRecommendations: number;
  withPlan: number;
  withoutPlan: number;
  planByStatus: Record<string, number>;
  overdueOpen: number;
  dueWithin7Days: number;
};

export type ActionPlanAuditEntry = {
  id: string;
  eventType: string;
  createdAt: string;
  actorId: string | null;
  oldValue: unknown;
  newValue: unknown;
};

export type SupervisionNoteEntry = {
  id: string;
  recommendationId: string;
  noteType: string;
  body: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  authorRole: string;
};

type RecommendationRowRaw = RecommendationWithPlansRow & {
  organizations: unknown;
  forms: unknown;
  created_at?: string;
};

type FormRow = { id: string; name: string; version: number };
type OrgRow = { id: string; name: string };
type QuestionJoin = {
  id: string;
  prompt: string;
  section_id: string | null;
  sections:
    | { name: string; axes: { name: string; id: string } | { name: string; id: string }[] | null }
    | { name: string; axes: { name: string; id: string } | { name: string; id: string }[] | null }[]
    | null;
};

const SELECT_BASE = `id, form_id, organization_id, question_id, recommendation_type,
         current_text, status, created_at, updated_at,
         questions:questions!inner(id, prompt, section_id, sections(name, axes(id, name))),
         forms:forms!inner(id, name, version),
         organizations:organizations!inner(id, name)`;

function planSelect(inner: boolean): string {
  const rel = inner ? "action_plans!inner" : "action_plans";
  return `${rel}(id, action_text, due_date, responsible_sector, responsible_name, status, observations, updated_at)`;
}

function todayISODate(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISODate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function rowToPlanActions(raw: unknown): ActionPlanAction[] {
  if (!raw) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  const out: ActionPlanAction[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object" || !("id" in row)) continue;
    const r = row as Record<string, unknown>;
    const dueDate = String(r.due_date ?? "").slice(0, 10);
    const status = r.status as ActionPlanAction["status"];
    const action: ActionPlanAction = {
      id: String(r.id),
      actionText: String(r.action_text ?? ""),
      dueDate,
      responsibleSector: String(r.responsible_sector ?? ""),
      responsibleName: String(r.responsible_name ?? ""),
      status,
      observations: (r.observations as string | null) ?? null,
      updatedAt: String(r.updated_at ?? ""),
      slaLabel: "na",
    };
    action.slaLabel = computeActionSla(action);
    out.push(action);
  }
  return out.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

export class ActionPlansAdminService {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async getByForm(
    formId: string,
    organizationId: string,
    caller: Caller,
  ): Promise<ActionPlanByFormPayload | null> {
    if (!isGlobalAdmin(caller)) {
      if (!caller.organizationId || caller.organizationId !== organizationId) {
        throw new ActionPlansNotFoundError();
      }
    }

    const [{ data: form }, { data: org }] = await Promise.all([
      this.supabase.from("forms").select("id,name,version").eq("id", formId).maybeSingle(),
      this.supabase.from("organizations").select("id,name").eq("id", organizationId).maybeSingle(),
    ]);
    if (!form?.id || !org?.id) return null;

    const { data, error } = await this.supabase
      .from("recommendations")
      .select(`${SELECT_BASE}, ${planSelect(false)}`)
      .eq("form_id", formId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;

    const rows = (data ?? []) as unknown as RecommendationRowRaw[];
    const questionIds = rows
      .map((row) => row.question_id as string | undefined)
      .filter((id): id is string => Boolean(id));
    const structuresByQuestion = await fetchQuestionStructures(this.supabase, questionIds);
    return buildActionPlanByFormPayload({
      formId,
      formName: String(form.name),
      formVersion: Number(form.version ?? 0),
      organizationId,
      organizationName: String(org.name),
      recommendationRows: rows,
      structuresByQuestion,
    });
  }

  async list(rawQuery: unknown, caller: Caller): Promise<ActionPlansListResult> {
    const query = this.parse(listActionPlansQuerySchema, rawQuery);

    const effectiveOrgId = isGlobalAdmin(caller)
      ? query.organizationId
      : caller.organizationId ?? "__none__";

    let busyRecommendationIds: string[] = [];
    if (query.view === "backlog") {
      let busyQ = this.supabase
        .from("action_plans")
        .select("recommendation_id, recommendations!inner(organization_id)")
        .in("status", ["in_progress", "completed"]);
      if (effectiveOrgId) {
        busyQ = busyQ.eq("recommendations.organization_id", effectiveOrgId);
      }
      if (query.formId) {
        busyQ = busyQ.eq("recommendations.form_id", query.formId);
      }
      const { data: busyRows, error: busyErr } = await busyQ;
      if (busyErr) throw busyErr;
      busyRecommendationIds = Array.from(
        new Set(
          (busyRows ?? []).map((r) => r.recommendation_id as string).filter(Boolean),
        ),
      );
    }

    const dueActive =
      query.dueFilter != null &&
      query.dueFilter !== "all" &&
      query.view !== "backlog";

    const usePlanInner =
      query.view === "in_progress" ||
      query.view === "completed" ||
      dueActive ||
      (query.planStatus != null && query.view === "overview") ||
      (query.responsibleContains != null && query.view === "overview");

    let req = this.supabase
      .from("recommendations")
      .select(`${SELECT_BASE}, ${planSelect(usePlanInner)}`, {
        count: "exact",
      })
      .order("created_at", { ascending: false });

    if (effectiveOrgId) req = req.eq("organization_id", effectiveOrgId);
    if (query.recommendationId) req = req.eq("id", query.recommendationId);
    if (query.formId) req = req.eq("form_id", query.formId);
    if (query.recommendationStatus) {
      req = req.eq("status", query.recommendationStatus);
    }
    if (query.view === "in_progress") {
      req = req.eq("action_plans.status", "in_progress");
    } else if (query.view === "completed") {
      req = req.eq("action_plans.status", "completed");
    } else if (query.view === "backlog" && busyRecommendationIds.length > 0) {
      const list = busyRecommendationIds.join(",");
      req = req.not("id", "in", `(${list})`);
    }

    if (query.search) {
      const term = `%${query.search.replace(/%/g, "")}%`;
      req = req.ilike("current_text", term);
    }

    if (query.planStatus && query.view === "overview") {
      req = req.eq("action_plans.status", query.planStatus);
    }

    if (query.responsibleContains && query.view !== "backlog") {
      const rawTerm = query.responsibleContains.replace(/%/g, "").replace(/,/g, "");
      const term = `%${rawTerm}%`;
      req = req.or(
        `responsible_name.ilike.${term},responsible_sector.ilike.${term}`,
        { foreignTable: "action_plans" },
      );
    }

    const today = todayISODate();
    const weekEnd = addDaysISODate(7);
    if (dueActive && query.dueFilter === "overdue") {
      req = req
        .lte("action_plans.due_date", today)
        .not("action_plans.status", "in", '("completed","cancelled")');
    } else if (dueActive && query.dueFilter === "due_7d") {
      req = req
        .gte("action_plans.due_date", today)
        .lte("action_plans.due_date", weekEnd)
        .not("action_plans.status", "in", '("completed","cancelled")');
    }

    const from = query.offset;
    const to = query.offset + query.limit - 1;
    req = req.range(from, to);

    const { data, error, count } = await req;
    if (error) throw error;

    let rows = (data ?? []) as unknown as RecommendationRowRaw[];

    if (query.responsibleContains && query.view === "backlog") {
      const term = query.responsibleContains.toLowerCase();
      rows = rows.filter((row) => {
        const plans = rowToPlanActions(row.action_plans);
        return plans.some(
          (plan) =>
            plan.responsibleName.toLowerCase().includes(term) ||
            plan.responsibleSector.toLowerCase().includes(term),
        );
      });
    }

    const questionIds = rows
      .map((row) => row.question_id as string | undefined)
      .filter((id): id is string => Boolean(id));
    const structures = await fetchQuestionStructures(this.supabase, questionIds);
    const items = rows.map((row) =>
      this.toListItem(row, structures.get(row.question_id as string)),
    );

    return {
      items,
      total: count ?? items.length,
      limit: query.limit,
      offset: query.offset,
      view: query.view,
    };
  }

  async metrics(rawQuery: unknown, caller: Caller): Promise<ActionPlanMetrics> {
    const query = this.parse(actionPlanMetricsQuerySchema, rawQuery);
    const effectiveOrgId = isGlobalAdmin(caller)
      ? query.organizationId
      : caller.organizationId ?? "__none__";

    let recsQ = this.supabase.from("recommendations").select("id");
    if (effectiveOrgId) recsQ = recsQ.eq("organization_id", effectiveOrgId);
    if (query.formId) recsQ = recsQ.eq("form_id", query.formId);
    const { data: recRows, error: recErr } = await recsQ;
    if (recErr) throw recErr;
    const allRecIds = (recRows ?? []).map((r) => r.id as string);
    const totalRecommendations = allRecIds.length;

    if (allRecIds.length === 0) {
      return {
        totalRecommendations: 0,
        withPlan: 0,
        withoutPlan: 0,
        planByStatus: {},
        overdueOpen: 0,
        dueWithin7Days: 0,
      };
    }

    const { data: plans, error: planErr } = await this.supabase
      .from("action_plans")
      .select("id, status, due_date, recommendation_id")
      .in("recommendation_id", allRecIds);
    if (planErr) throw planErr;

    const planByStatus: Record<string, number> = {};
    const recWithPlan = new Set<string>();
    let overdueOpen = 0;
    let dueWithin7Days = 0;
    const today = todayISODate();
    const weekEnd = addDaysISODate(7);

    for (const p of plans ?? []) {
      const st = String(p.status ?? "unknown");
      planByStatus[st] = (planByStatus[st] ?? 0) + 1;
      const rid = p.recommendation_id as string;
      recWithPlan.add(rid);
      const due = String(p.due_date ?? "").slice(0, 10);
      if (st === "completed" || st === "cancelled") continue;
      if (due && due < today) overdueOpen += 1;
      else if (due && due >= today && due <= weekEnd) dueWithin7Days += 1;
    }

    return {
      totalRecommendations,
      withPlan: recWithPlan.size,
      withoutPlan: Math.max(0, totalRecommendations - recWithPlan.size),
      planByStatus,
      overdueOpen,
      dueWithin7Days,
    };
  }

  async save(
    rawPayload: unknown,
    caller: Caller,
  ): Promise<{ planId: string; mode: "created" | "updated" }> {
    const payload = this.parse(saveActionPlanSchema, rawPayload);

    const { data: rec, error: recErr } = await this.supabase
      .from("recommendations")
      .select("id, organization_id, form_id, question_id")
      .eq("id", payload.recommendationId)
      .maybeSingle();
    if (recErr) throw recErr;
    if (!rec) throw new ActionPlansNotFoundError("Recomendacao nao encontrada.");

    assertRecommendationBelongsToForm(rec.form_id as string, payload.formId);
    this.enforceOrgScope(caller, rec.organization_id as string);

    const axisId = await resolveAxisIdForRecommendation(this.supabase, payload.recommendationId);
    if (!axisId) {
      const qid = rec.question_id as string | undefined;
      let structure: unknown = null;
      if (qid) {
        const structures = await fetchQuestionStructures(this.supabase, [qid]);
        const entry = structures.get(qid);
        structure = entry
          ? {
              structuralAxisId: entry.structuralAxisId,
              libraryAxisRefId: entry.libraryAxisRefId,
              sectionId: entry.sectionId,
              axisName: entry.axisName,
              sectionName: entry.sectionName,
              source: entry.source,
            }
          : null;
      }
      logInfo("action_plans.axis_unresolved", {
        recommendationId: payload.recommendationId,
        questionId: qid ?? null,
        hasQuestionId: Boolean(qid),
        structure,
        callerRole: caller.role,
        organizationId: rec.organization_id,
        formId: rec.form_id,
      });

      const respondent = caller.role === "respondent";
      throw new ActionPlansValidationError([
        {
          path: respondent ? "_" : "recommendationId",
          message: respondent ? RESPONDENT_AXIS_UNRESOLVED_MESSAGE : STAFF_AXIS_UNRESOLVED_MESSAGE,
        },
      ]);
    }

    if (payload.planId) {
      const { data: existingRow, error: exErr } = await this.supabase
        .from("action_plans")
        .select("id, recommendation_id")
        .eq("id", payload.planId)
        .maybeSingle();
      if (exErr) throw exErr;
      if (!existingRow) throw new ActionPlansNotFoundError("Plano nao encontrado.");
      if ((existingRow.recommendation_id as string) !== payload.recommendationId) {
        throw new ActionPlansValidationError([
          { path: "planId", message: "Acao nao pertence a esta recomendacao." },
        ]);
      }

      const { data: updated, error: updateError } = await this.supabase
        .from("action_plans")
        .update({
          recommendation_id: payload.recommendationId,
          axis_id: axisId,
          form_id: rec.form_id as string,
          action_text: payload.actionText,
          due_date: payload.dueDate,
          responsible_sector: payload.responsibleSector,
          responsible_name: payload.responsibleName,
          status: payload.status,
          observations: payload.observations ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.planId)
        .select("id")
        .single();
      if (updateError) throw updateError;
      logInfo("action_plans.admin.updated", {
        recommendationId: payload.recommendationId,
        planId: updated?.id,
      });
      return { planId: updated!.id as string, mode: "updated" };
    }

    const { data: created, error: createError } = await this.supabase
      .from("action_plans")
      .insert({
        recommendation_id: payload.recommendationId,
        form_id: rec.form_id as string,
        axis_id: axisId,
        action_text: payload.actionText,
        due_date: payload.dueDate,
        responsible_sector: payload.responsibleSector,
        responsible_name: payload.responsibleName,
        status: payload.status,
        observations: payload.observations ?? null,
      })
      .select("id")
      .single();
    if (createError) throw createError;
    logInfo("action_plans.admin.created", {
      recommendationId: payload.recommendationId,
      planId: created?.id,
    });
    return { planId: created!.id as string, mode: "created" };
  }

  async listPlanAudit(planId: string, caller: Caller): Promise<ActionPlanAuditEntry[]> {
    const { data: plan, error: pErr } = await this.supabase
      .from("action_plans")
      .select("id, recommendation_id")
      .eq("id", planId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!plan) throw new ActionPlansNotFoundError("Plano nao encontrado.");

    const { data: rec, error: rErr } = await this.supabase
      .from("recommendations")
      .select("organization_id")
      .eq("id", plan.recommendation_id as string)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!rec) throw new ActionPlansNotFoundError();
    this.enforceOrgScope(caller, rec.organization_id as string);

    const { data: logs, error: lErr } = await this.supabase
      .from("audit_logs")
      .select("id, event_type, created_at, actor_id, old_value, new_value")
      .eq("table_name", "action_plans")
      .eq("record_id", planId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (lErr) throw lErr;

    return (logs ?? []).map((row) => ({
      id: row.id as string,
      eventType: row.event_type as string,
      createdAt: row.created_at as string,
      actorId: (row.actor_id as string | null) ?? null,
      oldValue: row.old_value,
      newValue: row.new_value,
    }));
  }

  async listSupervisionNotes(
    rawQuery: unknown,
    caller: Caller,
  ): Promise<SupervisionNoteEntry[]> {
    const query = this.parse(listSupervisionNotesQuerySchema, rawQuery);
    await this.assertRecommendationScope(query.recommendationId, caller);

    const { data, error } = await this.supabase
      .from("action_plan_supervision_notes")
      .select("id, recommendation_id, note_type, body, created_at, author_id, author_role")
      .eq("recommendation_id", query.recommendationId)
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    const rows = data ?? [];
    const authorIds = Array.from(new Set(rows.map((r) => String(r.author_id)).filter(Boolean)));
    const nameById = await this.loadProfileNames(authorIds);

    return rows.map((row) => ({
      id: row.id as string,
      recommendationId: row.recommendation_id as string,
      noteType: row.note_type as string,
      body: row.body as string,
      createdAt: row.created_at as string,
      authorId: row.author_id as string,
      authorName: nameById.get(row.author_id as string) ?? "Usuário",
      authorRole: row.author_role as string,
    }));
  }

  async createSupervisionNote(
    rawPayload: unknown,
    caller: Caller,
    actorUserId: string,
  ): Promise<SupervisionNoteEntry> {
    if (caller.role !== "admin") {
      throw new ActionPlansValidationError([
        { path: "_", message: "Somente administradores podem registrar pareceres." },
      ]);
    }

    const payload = this.parse(createSupervisionNoteSchema, rawPayload);
    await this.assertRecommendationScope(payload.recommendationId, caller);

    const { data, error } = await this.supabase
      .from("action_plan_supervision_notes")
      .insert({
        recommendation_id: payload.recommendationId,
        author_id: actorUserId,
        author_role: caller.role,
        note_type: payload.noteType,
        body: payload.body,
      })
      .select("id, recommendation_id, note_type, body, created_at, author_id, author_role")
      .single();
    if (error) throw error;

    logInfo("action_plans.supervision_note.created", {
      recommendationId: payload.recommendationId,
      noteType: payload.noteType,
      authorUserId: actorUserId,
    });

    const nameById = await this.loadProfileNames([actorUserId]);
    return {
      id: data!.id as string,
      recommendationId: data!.recommendation_id as string,
      noteType: data!.note_type as string,
      body: data!.body as string,
      createdAt: data!.created_at as string,
      authorId: data!.author_id as string,
      authorName: nameById.get(actorUserId) ?? "Usuário",
      authorRole: data!.author_role as string,
    };
  }

  private async assertRecommendationScope(recommendationId: string, caller: Caller) {
    const { data: rec, error } = await this.supabase
      .from("recommendations")
      .select("id, organization_id")
      .eq("id", recommendationId)
      .maybeSingle();
    if (error) throw error;
    if (!rec) throw new ActionPlansNotFoundError("Recomendacao nao encontrada.");
    this.enforceOrgScope(caller, rec.organization_id as string);
  }

  private async loadProfileNames(userIds: string[]): Promise<Map<string, string>> {
    const nameById = new Map<string, string>();
    if (userIds.length === 0) return nameById;

    const { data: profiles, error } = await this.supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", userIds);
    if (error) throw error;

    for (const p of profiles ?? []) {
      const userId = p.user_id as string;
      const fullName = (p.full_name as string | null) ?? null;
      if (!fullName?.trim()) continue;
      nameById.set(userId, displayNameFromProfile(fullName, null));
    }
    return nameById;
  }

  private parse<T>(schema: ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.map((p) => String(p)).join(".") || "_",
        message: i.message,
      }));
      throw new ActionPlansValidationError(
        issues.length > 0 ? issues : [{ path: "_", message: "Dados invalidos." }],
      );
    }
    return parsed.data;
  }

  private enforceOrgScope(caller: Caller, rowOrganizationId: string) {
    if (isGlobalAdmin(caller)) return;
    if (!caller.organizationId || caller.organizationId !== rowOrganizationId) {
      throw new ActionPlansNotFoundError();
    }
  }

  private toListItem(
    row: RecommendationRowRaw,
    structure?: { axisName: string; sectionName: string },
  ): ActionPlanListItem {
    const form = pickOne(row.forms as FormRow | FormRow[] | null);
    const org = pickOne(row.organizations as OrgRow | OrgRow[] | null);
    const question = pickOne(row.questions as QuestionJoin | QuestionJoin[] | null);
    const section = question ? pickOne(question.sections) : null;
    const axis = section?.axes ? pickOne(section.axes) : null;
    const plans = rowToPlanActions(row.action_plans);
    const slaLabel = aggregateSlaFromActions(plans);
    const item: ActionPlanListItem = {
      recommendationId: row.id,
      questionId: (row.question_id as string) ?? "",
      formId: row.form_id,
      formName: form?.name ?? "(formulario removido)",
      formVersion: form?.version ?? 0,
      organizationId: row.organization_id,
      organizationName: org?.name ?? "(org removida)",
      questionPrompt: question?.prompt ?? "(pergunta removida)",
      sectionName: structure?.sectionName || section?.name || "",
      axisName: structure?.axisName || axis?.name || "",
      recommendationType: row.recommendation_type,
      recommendationText: row.current_text,
      recommendationStatus: row.status,
      plans,
      slaLabel,
      recommendationCreatedAt: row.created_at,
    };
    return item;
  }
}
