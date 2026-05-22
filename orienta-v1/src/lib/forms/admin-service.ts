import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logInfo } from "@/lib/observability/logger";
import {
  archiveFormSchema,
  createFormSchema,
  createQuestionSchema,
  renameFormSchema,
  reorderSchema,
  setDeadlineSchema,
  updateQuestionSchema,
} from "./schemas";

type Client = SupabaseClient;

/** Erro de validacao do dominio de formularios (retorna 400). */
export class FormsValidationError extends Error {
  issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super("Dados invalidos para formulario ou pergunta.");
    this.name = "FormsValidationError";
    this.issues = issues;
  }
}

/** Conflito de estado (retorna 409): form publicado, respostas existentes etc. */
export class FormsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FormsConflictError";
  }
}

/** Nao encontrado (retorna 404). */
export class FormsNotFoundError extends Error {
  constructor(message = "Registro nao encontrado.") {
    super(message);
    this.name = "FormsNotFoundError";
  }
}

export type FormSummary = {
  id: string;
  name: string;
  version: number;
  state: string;
  archivedAt: string | null;
  createdAt: string;
  questionCount: number;
  responseDeadlineAt: string | null;
  closedAt: string | null;
};

export type QuestionRow = {
  id: string;
  prompt: string;
  requiresEvidence: boolean;
  orderIndex: number;
};

type FormRow = {
  id: string;
  name: string;
  version: number;
  state: string;
  archived_at: string | null;
  created_at: string;
  created_by: string;
  response_deadline_at?: string | null;
  closed_at?: string | null;
};

function mapForm(row: FormRow, questionCount = 0): FormSummary {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    state: row.state,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    questionCount,
    responseDeadlineAt: row.response_deadline_at ?? null,
    closedAt: row.closed_at ?? null,
  };
}

/**
 * Servico de alto nivel para CRUD de formularios e perguntas no admin. Toda
 * manipulacao de estado agregado passa por aqui para garantir regras comuns
 * (so draft pode editar, arquivar zera edicao, reordenacao atomica etc.).
 */
export class FormsAdminService {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  // -- Formularios --------------------------------------------------------

  async list(options: { includeArchived?: boolean } = {}): Promise<FormSummary[]> {
    const query = this.supabase
      .from("forms")
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .order("created_at", { ascending: false });

    if (!options.includeArchived) {
      query.is("archived_at", null);
    }

    const { data, error } = await query;
    if (error) throw error;
    const forms = (data ?? []) as FormRow[];

    if (forms.length === 0) return [];

    const ids = forms.map((f) => f.id);
    const { data: counts, error: cErr } = await this.supabase
      .from("form_questions")
      .select("form_id")
      .in("form_id", ids);
    if (cErr) throw cErr;

    const countByForm = new Map<string, number>();
    for (const row of counts ?? []) {
      const fid = (row as { form_id: string }).form_id;
      countByForm.set(fid, (countByForm.get(fid) ?? 0) + 1);
    }

    return forms.map((f) => mapForm(f, countByForm.get(f.id) ?? 0));
  }

  async getById(formId: string): Promise<FormSummary> {
    const row = await this.loadFormRow(formId);
    const { count, error } = await this.supabase
      .from("form_questions")
      .select("form_id", { count: "exact", head: true })
      .eq("form_id", formId);
    if (error) throw error;
    return mapForm(row, count ?? 0);
  }

  async create(
    input: unknown,
    actor: { userId: string },
  ): Promise<FormSummary> {
    const value = this.parse(createFormSchema, input);
    const { data, error } = await this.supabase
      .from("forms")
      .insert({
        name: value.name,
        version: 1,
        state: "draft",
        created_by: actor.userId,
      })
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .single();
    if (error) {
      // 23505 = unique_violation em (name, version)
      if ((error as { code?: string }).code === "23505") {
        throw new FormsConflictError(
          "Ja existe um formulario com esse nome. Use um nome diferente.",
        );
      }
      throw error;
    }
    logInfo("forms.admin.created", { formId: data.id, actorUserId: actor.userId });
    return mapForm(data as FormRow, 0);
  }

  async rename(formId: string, input: unknown): Promise<FormSummary> {
    const value = this.parse(renameFormSchema, input);
    await this.ensureDraft(formId);
    const { data, error } = await this.supabase
      .from("forms")
      .update({ name: value.name })
      .eq("id", formId)
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .single();
    if (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new FormsConflictError(
          "Ja existe um formulario com esse nome. Use um nome diferente.",
        );
      }
      throw error;
    }
    return mapForm(data as FormRow);
  }

  async setArchived(formId: string, input: unknown): Promise<FormSummary> {
    const value = this.parse(archiveFormSchema, input);
    await this.loadFormRow(formId);
    const archivedAt = value.archived ? new Date().toISOString() : null;
    const { data, error } = await this.supabase
      .from("forms")
      .update({ archived_at: archivedAt })
      .eq("id", formId)
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .single();
    if (error) throw error;
    logInfo("forms.admin.archive_toggled", { formId, archived: value.archived });
    return mapForm(data as FormRow);
  }

  async setDeadline(formId: string, input: unknown): Promise<FormSummary> {
    const value = this.parse(setDeadlineSchema, input);
    await this.loadFormRow(formId);
    const { data, error } = await this.supabase
      .from("forms")
      .update({ response_deadline_at: value.responseDeadlineAt })
      .eq("id", formId)
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .single();
    if (error) throw error;
    logInfo("forms.admin.deadline_set", {
      formId,
      responseDeadlineAt: value.responseDeadlineAt,
    });
    return mapForm(data as FormRow);
  }

  async deleteForm(formId: string): Promise<void> {
    const form = await this.loadFormRow(formId);
    if (form.state !== "draft") {
      throw new FormsConflictError(
        "Apenas formularios em rascunho podem ser excluidos.",
      );
    }
    const { count: responseCount, error: respErr } = await this.supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId);
    if (respErr) throw respErr;
    if ((responseCount ?? 0) > 0) {
      throw new FormsConflictError(
        "Este formulario ja possui respostas e nao pode ser excluido.",
      );
    }

    // Remove vinculos de perguntas (cascata nao cobre outros FK). form_questions
    // ja tem ON DELETE CASCADE em forms, mas garantimos explicitamente para
    // poder eventualmente fazer hard-delete de questions orfas.
    const { data: fqRows, error: fqErr } = await this.supabase
      .from("form_questions")
      .select("question_id")
      .eq("form_id", formId);
    if (fqErr) throw fqErr;
    const questionIds = (fqRows ?? []).map(
      (r) => (r as { question_id: string }).question_id,
    );

    // Remove os vinculos explicitamente antes de deletar o form. Em producao,
    // a FK `form_questions.form_id` tem `ON DELETE CASCADE`, mas queremos
    // garantir que `maybeHardDeleteQuestion` veja zero vinculos restantes.
    const { error: fqDelErr } = await this.supabase
      .from("form_questions")
      .delete()
      .eq("form_id", formId);
    if (fqDelErr) throw fqDelErr;

    const { error: delFormErr } = await this.supabase
      .from("forms")
      .delete()
      .eq("id", formId);
    if (delFormErr) throw delFormErr;

    for (const qid of questionIds) {
      await this.maybeHardDeleteQuestion(qid);
    }

    logInfo("forms.admin.deleted", { formId });
  }

  // -- Perguntas ----------------------------------------------------------

  async listQuestions(formId: string): Promise<QuestionRow[]> {
    await this.loadFormRow(formId);
    const { data: links, error: lErr } = await this.supabase
      .from("form_questions")
      .select("question_id, order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: true });
    if (lErr) throw lErr;

    const ids = (links ?? []).map(
      (r) => (r as { question_id: string }).question_id,
    );
    if (ids.length === 0) return [];

    const { data: qs, error: qErr } = await this.supabase
      .from("questions")
      .select("id, prompt, requires_evidence")
      .in("id", ids);
    if (qErr) throw qErr;

    const qById = new Map<
      string,
      { id: string; prompt: string; requires_evidence: boolean }
    >();
    for (const q of qs ?? []) {
      const row = q as { id: string; prompt: string; requires_evidence: boolean };
      qById.set(row.id, row);
    }

    return (links ?? []).flatMap((link) => {
      const l = link as { question_id: string; order_index: number };
      const q = qById.get(l.question_id);
      if (!q) return [];
      return [
        {
          id: q.id,
          prompt: q.prompt,
          requiresEvidence: Boolean(q.requires_evidence),
          orderIndex: l.order_index,
        } satisfies QuestionRow,
      ];
    });
  }

  async createQuestion(
    formId: string,
    input: unknown,
  ): Promise<QuestionRow> {
    const value = this.parse(createQuestionSchema, input);
    await this.ensureDraft(formId);

    const { data: maxRow, error: maxErr } = await this.supabase
      .from("form_questions")
      .select("order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (maxErr) throw maxErr;
    const nextIndex =
      typeof maxRow?.order_index === "number" ? maxRow.order_index + 1 : 0;

    const { data: qRow, error: qErr } = await this.supabase
      .from("questions")
      .insert({
        prompt: value.prompt,
        requires_evidence: value.requiresEvidence,
        // Campos legacy (agora opcionais via migration 0011). Mantemos null
        // para perguntas novas — a recomendacao vem do binding inline.
        section_id: null,
        recommendation_text: null,
        fami_enabled: true,
        applies_to_respondent: true,
      })
      .select("id, prompt, requires_evidence")
      .single();
    if (qErr) throw qErr;

    const { error: linkErr } = await this.supabase
      .from("form_questions")
      .insert({
        form_id: formId,
        question_id: qRow.id,
        order_index: nextIndex,
      });
    if (linkErr) throw linkErr;

    logInfo("forms.admin.question_created", {
      formId,
      questionId: qRow.id,
      orderIndex: nextIndex,
    });

    return {
      id: qRow.id as string,
      prompt: qRow.prompt as string,
      requiresEvidence: Boolean(qRow.requires_evidence),
      orderIndex: nextIndex,
    };
  }

  async updateQuestion(
    formId: string,
    questionId: string,
    input: unknown,
  ): Promise<QuestionRow> {
    const value = this.parse(updateQuestionSchema, input);
    await this.ensureDraft(formId);

    // Garantir que a pergunta pertence a este form (nao permite edicao
    // cross-form para evitar efeito colateral em outros formularios).
    const { data: link, error: linkErr } = await this.supabase
      .from("form_questions")
      .select("order_index")
      .eq("form_id", formId)
      .eq("question_id", questionId)
      .maybeSingle();
    if (linkErr) throw linkErr;
    if (!link) throw new FormsNotFoundError("Pergunta nao encontrada neste formulario.");

    const payload: Record<string, unknown> = {};
    if (value.prompt !== undefined) payload.prompt = value.prompt;
    if (value.requiresEvidence !== undefined)
      payload.requires_evidence = value.requiresEvidence;

    const { data: qRow, error: qErr } = await this.supabase
      .from("questions")
      .update(payload)
      .eq("id", questionId)
      .select("id, prompt, requires_evidence")
      .single();
    if (qErr) throw qErr;

    return {
      id: qRow.id as string,
      prompt: qRow.prompt as string,
      requiresEvidence: Boolean(qRow.requires_evidence),
      orderIndex: (link as { order_index: number }).order_index,
    };
  }

  async removeQuestion(formId: string, questionId: string): Promise<void> {
    await this.ensureDraft(formId);
    const { error } = await this.supabase
      .from("form_questions")
      .delete()
      .eq("form_id", formId)
      .eq("question_id", questionId);
    if (error) throw error;
    await this.maybeHardDeleteQuestion(questionId);

    // Compacta order_index para continuar 0..n-1.
    await this.compactOrder(formId);

    logInfo("forms.admin.question_removed", { formId, questionId });
  }

  async reorderQuestions(formId: string, input: unknown): Promise<QuestionRow[]> {
    const value = this.parse(reorderSchema, input);
    await this.ensureDraft(formId);

    const current = await this.listQuestions(formId);
    const currentIds = new Set(current.map((q) => q.id));
    const payloadIds = new Set(value.orderedQuestionIds);

    if (
      payloadIds.size !== currentIds.size ||
      value.orderedQuestionIds.length !== currentIds.size
    ) {
      throw new FormsValidationError([
        {
          path: "orderedQuestionIds",
          message:
            "A lista de ordem nao corresponde ao conjunto atual de perguntas do formulario.",
        },
      ]);
    }
    for (const id of payloadIds) {
      if (!currentIds.has(id)) {
        throw new FormsValidationError([
          {
            path: "orderedQuestionIds",
            message: `Pergunta ${id} nao pertence a este formulario.`,
          },
        ]);
      }
    }

    // Aplica em duas fases para evitar conflitos com o index composto
    // (form_id, order_index) se houver unique constraint no futuro: primeiro
    // desloca tudo para um intervalo alto e depois grava os valores finais.
    const offset = 10000;
    for (let i = 0; i < value.orderedQuestionIds.length; i++) {
      const qid = value.orderedQuestionIds[i];
      const { error } = await this.supabase
        .from("form_questions")
        .update({ order_index: offset + i })
        .eq("form_id", formId)
        .eq("question_id", qid);
      if (error) throw error;
    }
    for (let i = 0; i < value.orderedQuestionIds.length; i++) {
      const qid = value.orderedQuestionIds[i];
      const { error } = await this.supabase
        .from("form_questions")
        .update({ order_index: i })
        .eq("form_id", formId)
        .eq("question_id", qid);
      if (error) throw error;
    }

    return this.listQuestions(formId);
  }

  // -- Helpers internos ---------------------------------------------------

  private parse<T>(schema: ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.map((p) => String(p)).join(".") || "_",
        message: i.message,
      }));
      throw new FormsValidationError(
        issues.length > 0 ? issues : [{ path: "_", message: "Dados invalidos." }],
      );
    }
    return parsed.data;
  }

  private async loadFormRow(formId: string): Promise<FormRow> {
    const { data, error } = await this.supabase
      .from("forms")
      .select("id,name,version,state,archived_at,created_at,created_by,response_deadline_at,closed_at")
      .eq("id", formId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new FormsNotFoundError("Formulario nao encontrado.");
    return data as FormRow;
  }

  private async ensureDraft(formId: string): Promise<FormRow> {
    const row = await this.loadFormRow(formId);
    if (row.state !== "draft") {
      throw new FormsConflictError(
        "Apenas formularios em rascunho podem ser editados. Publique uma nova versao para alterar perguntas.",
      );
    }
    if (row.archived_at) {
      throw new FormsConflictError(
        "Este formulario esta arquivado. Desarquive antes de editar.",
      );
    }
    return row;
  }

  /**
   * Se a pergunta nao for usada em outros formularios e nao tiver `responses`,
   * deleta-a do banco (hard delete). Caso contrario, deixa-a preservada para
   * nao perder historico. Chamado apos remover o link em `form_questions`.
   */
  private async maybeHardDeleteQuestion(questionId: string): Promise<void> {
    const { count: linkCount, error: linkErr } = await this.supabase
      .from("form_questions")
      .select("form_id", { count: "exact", head: true })
      .eq("question_id", questionId);
    if (linkErr) throw linkErr;
    if ((linkCount ?? 0) > 0) return;

    const { count: respCount, error: respErr } = await this.supabase
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("question_id", questionId);
    if (respErr) throw respErr;
    if ((respCount ?? 0) > 0) return;

    // Remove vinculo de biblioteca junto (evita leak de binding orfa).
    await this.supabase
      .from("question_library_binding")
      .delete()
      .eq("question_id", questionId);

    const { error: delErr } = await this.supabase
      .from("questions")
      .delete()
      .eq("id", questionId);
    if (delErr) throw delErr;
  }

  /** Garante que order_index continua 0..n-1 apos remocoes. */
  private async compactOrder(formId: string): Promise<void> {
    const { data: rows, error } = await this.supabase
      .from("form_questions")
      .select("question_id, order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: true });
    if (error) throw error;
    const list = (rows ?? []) as Array<{ question_id: string; order_index: number }>;
    for (let i = 0; i < list.length; i++) {
      if (list[i].order_index === i) continue;
      const { error: updErr } = await this.supabase
        .from("form_questions")
        .update({ order_index: i })
        .eq("form_id", formId)
        .eq("question_id", list[i].question_id);
      if (updErr) throw updErr;
    }
  }
}
