import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { FormsNotFoundError, FormsValidationError } from "./admin-service";
import { deriveRespondentStatus } from "./answers-status";
import {
  RESPONDENT_LIST_DEFAULT_LIMIT,
  RESPONDENT_LIST_MAX_LIMIT,
  RESPONDENT_STATUS_VALUES,
  SUMMARY_TEXT_ENTRIES_LIMIT,
  type AnswersListQuery,
  type AnswersOverview,
  type AnswersSummary,
  type AnswersSummaryQuestion,
  type AnswerTextEntry,
  type AnswerValue,
  type QuestionAnswerType,
  type RespondentAnswerCell,
  type RespondentContributor,
  type RespondentDetail,
  type RespondentFilterOptions,
  type RespondentListPage,
  type RespondentRow,
  type RespondentStatus,
} from "./answers-types";

type Client = SupabaseClient;

/**
 * Mapeia o `metric.answerType` armazenado no binding (texto livre em JSON) para
 * o universo fechado da UI. Quando ausente, assume `yes_no` (caso herdado).
 */
function normalizeAnswerType(raw: unknown): QuestionAnswerType {
  if (!raw || typeof raw !== "object") return "yes_no";
  const at = (raw as Record<string, unknown>).answerType;
  if (at === "scale" || at === "numeric" || at === "text") return at;
  return "yes_no";
}

/**
 * Servico de leitura/agregacao para a aba "Respostas" do modulo Formularios.
 *
 * Convencoes:
 * - Um "respondente" e uma ORGANIZACAO. Multiplos usuarios da mesma org sao
 *   listados como contribuidores no detalhe.
 * - Status do respondente nao esta persistido: e derivado em
 *   `deriveRespondentStatus`. Os filtros aplicam o derivado em memoria.
 * - Paginacao da listagem usa cursor `(lastUpdatedAt, organizationId)` —
 *   evita custo crescente de OFFSET em formularios com milhares de orgaos.
 *
 * Toda escrita continua em `FormsAdminService`. Este servico nao muta dados.
 */
export class FormsAnswersService {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  // -- Visao geral --------------------------------------------------------

  async getOverview(formId: string): Promise<AnswersOverview> {
    const form = await this.loadFormBasic(formId);
    const questionIds = await this.loadFormQuestionIds(formId);
    const totalQuestions = questionIds.length;

    const orgsResult = await this.collectOrganizationStats(formId, questionIds);
    const totalRespondents = orgsResult.size;
    const lastAnswerAt = orgsResult.lastAnswerAt;

    const statusBreakdown: Record<RespondentStatus, number> = {
      nao_iniciada: 0,
      em_preenchimento: 0,
      completa: 0,
      submetida: 0,
      em_complementacao: 0,
    };
    for (const stat of orgsResult.byOrg.values()) {
      const status = deriveRespondentStatus({
        answered: stat.answeredQuestions,
        total: totalQuestions,
        hasSubmission: stat.hasSubmission,
        hasComplementationRequested: stat.hasComplementationRequested,
      });
      statusBreakdown[status] += 1;
    }

    return {
      formId,
      formName: form.name,
      totalRespondents,
      totalQuestions,
      lastAnswerAt,
      statusBreakdown,
    };
  }

  // -- Resumo por pergunta ------------------------------------------------

  async getSummary(formId: string): Promise<AnswersSummary> {
    await this.loadFormBasic(formId);
    const orderedQuestions = await this.loadOrderedQuestions(formId);
    if (orderedQuestions.length === 0) {
      return { formId, totalRespondents: 0, questions: [] };
    }

    const questionIds = orderedQuestions.map((q) => q.id);

    const [responsesRes, bindingsRes] = await Promise.all([
      this.supabase
        .from("responses")
        .select("id,question_id,organization_id,answer,notes,updated_at")
        .eq("form_id", formId)
        .in("question_id", questionIds)
        .order("updated_at", { ascending: false }),
      this.supabase
        .from("question_library_binding")
        .select("question_id,metric")
        .in("question_id", questionIds),
    ]);

    if (responsesRes.error) throw responsesRes.error;
    if (bindingsRes.error) throw bindingsRes.error;

    const bindingByQuestion = new Map<string, unknown>();
    for (const row of bindingsRes.data ?? []) {
      bindingByQuestion.set(
        (row as { question_id: string }).question_id,
        (row as { metric?: unknown }).metric,
      );
    }

    const responses = (responsesRes.data ?? []) as Array<{
      id: string;
      question_id: string;
      organization_id: string;
      answer: AnswerValue | null;
      notes: string | null;
      updated_at: string;
    }>;

    const orgIds = new Set<string>();
    for (const r of responses) orgIds.add(r.organization_id);
    const orgNameById = await this.loadOrganizationNames(Array.from(orgIds));

    const byQuestion = new Map<string, typeof responses>();
    for (const r of responses) {
      const list = byQuestion.get(r.question_id) ?? [];
      list.push(r);
      byQuestion.set(r.question_id, list);
    }

    const totalRespondents = orgIds.size;
    const questions: AnswersSummaryQuestion[] = orderedQuestions.map((q) => {
      const list = byQuestion.get(q.id) ?? [];
      const distribution = { yes: 0, no: 0, not_applicable: 0 };
      for (const row of list) {
        if (row.answer === "yes") distribution.yes += 1;
        else if (row.answer === "no") distribution.no += 1;
        else if (row.answer === "not_applicable") distribution.not_applicable += 1;
      }

      const answerType = normalizeAnswerType(bindingByQuestion.get(q.id));
      const textEntries: AnswerTextEntry[] =
        answerType === "text"
          ? list
              .filter((r) => (r.notes ?? "").trim().length > 0)
              .slice(0, SUMMARY_TEXT_ENTRIES_LIMIT)
              .map((r) => ({
                responseId: r.id,
                organizationId: r.organization_id,
                organizationName: orgNameById.get(r.organization_id) ?? "",
                notes: r.notes ?? "",
                answer: r.answer,
                updatedAt: r.updated_at,
              }))
          : [];

      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        prompt: q.prompt,
        answerType,
        totalResponses: list.length,
        distribution,
        textEntries,
      } satisfies AnswersSummaryQuestion;
    });

    return { formId, totalRespondents, questions };
  }

  // -- Listagem de respondentes ------------------------------------------

  async listRespondents(
    formId: string,
    query: AnswersListQuery = {},
  ): Promise<RespondentListPage> {
    await this.loadFormBasic(formId);
    const questionIds = await this.loadFormQuestionIds(formId);
    const totalQuestions = questionIds.length;

    const stats = await this.collectOrganizationStats(formId, questionIds, {
      organizationId: query.organizationId ?? null,
    });

    const orgIds = Array.from(stats.byOrg.keys());
    const orgNameById = await this.loadOrganizationNames(orgIds);
    const contributorCountByOrg = await this.countContributorsByOrg(
      formId,
      orgIds,
    );

    let rows: RespondentRow[] = orgIds.map((organizationId) => {
      const stat = stats.byOrg.get(organizationId)!;
      const status = deriveRespondentStatus({
        answered: stat.answeredQuestions,
        total: totalQuestions,
        hasSubmission: stat.hasSubmission,
        hasComplementationRequested: stat.hasComplementationRequested,
      });
      return {
        organizationId,
        organizationName: orgNameById.get(organizationId) ?? "",
        answeredQuestions: stat.answeredQuestions,
        totalQuestions,
        lastUpdatedAt: stat.lastUpdatedAt,
        status,
        contributorCount: contributorCountByOrg.get(organizationId) ?? 0,
      } satisfies RespondentRow;
    });

    if (query.status) {
      rows = rows.filter((r) => r.status === query.status);
    }
    if (query.from) {
      const fromMs = Date.parse(query.from);
      if (!Number.isNaN(fromMs)) {
        rows = rows.filter((r) => Date.parse(r.lastUpdatedAt) >= fromMs);
      }
    }
    if (query.to) {
      const toMs = Date.parse(query.to);
      if (!Number.isNaN(toMs)) {
        rows = rows.filter((r) => Date.parse(r.lastUpdatedAt) <= toMs);
      }
    }

    rows.sort((a, b) => {
      const diff = Date.parse(b.lastUpdatedAt) - Date.parse(a.lastUpdatedAt);
      if (diff !== 0) return diff;
      return a.organizationId.localeCompare(b.organizationId);
    });

    if (query.cursor) {
      const cursorMs = Date.parse(query.cursor.updatedAt);
      const cursorOrg = query.cursor.organizationId;
      rows = rows.filter((r) => {
        const ms = Date.parse(r.lastUpdatedAt);
        if (ms < cursorMs) return true;
        if (ms > cursorMs) return false;
        return r.organizationId.localeCompare(cursorOrg) > 0;
      });
    }

    const limit = Math.min(
      Math.max(query.limit ?? RESPONDENT_LIST_DEFAULT_LIMIT, 1),
      RESPONDENT_LIST_MAX_LIMIT,
    );

    const page = rows.slice(0, limit);
    const nextCursor =
      rows.length > limit
        ? {
            updatedAt: page[page.length - 1].lastUpdatedAt,
            organizationId: page[page.length - 1].organizationId,
          }
        : null;

    return { rows: page, nextCursor };
  }

  async listFilterOptions(formId: string): Promise<RespondentFilterOptions> {
    await this.loadFormBasic(formId);
    const { data, error } = await this.supabase
      .from("responses")
      .select("organization_id")
      .eq("form_id", formId);
    if (error) throw error;
    const ids = new Set<string>();
    for (const row of data ?? []) {
      ids.add((row as { organization_id: string }).organization_id);
    }
    const names = await this.loadOrganizationNames(Array.from(ids));
    const organizations = Array.from(ids)
      .map((id) => ({ id, name: names.get(id) ?? "" }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { organizations };
  }

  // -- Detalhe individual -------------------------------------------------

  async getRespondentDetail(
    formId: string,
    organizationId: string,
  ): Promise<RespondentDetail> {
    await this.loadFormBasic(formId);
    const orderedQuestions = await this.loadOrderedQuestions(formId);
    const questionIds = orderedQuestions.map((q) => q.id);

    const [orgRes, responsesRes, bindingsRes, famiRes, waiversRes] = await Promise.all([
      this.supabase
        .from("organizations")
        .select("id,name")
        .eq("id", organizationId)
        .maybeSingle(),
      questionIds.length > 0
        ? this.supabase
            .from("responses")
            .select(
              "id,question_id,answer,notes,updated_at,created_at,created_by,is_not_applicable",
            )
            .eq("form_id", formId)
            .eq("organization_id", organizationId)
            .in("question_id", questionIds)
        : Promise.resolve({ data: [], error: null }),
      questionIds.length > 0
        ? this.supabase
            .from("question_library_binding")
            .select("question_id,metric,bindings")
            .in("question_id", questionIds)
        : Promise.resolve({ data: [], error: null }),
      this.supabase
        .from("fami_results")
        .select("id")
        .eq("form_id", formId)
        .eq("organization_id", organizationId)
        .limit(1),
      this.supabase
        .from("question_organization_waivers")
        .select("question_id,reason")
        .eq("organization_id", organizationId),
    ]);

    if (orgRes.error) throw orgRes.error;
    if (!orgRes.data) {
      throw new FormsNotFoundError("Organizacao nao encontrada.");
    }
    if (responsesRes.error) throw responsesRes.error;
    if (bindingsRes.error) throw bindingsRes.error;
    if (famiRes.error) throw famiRes.error;
    if (waiversRes.error) throw waiversRes.error;

    const responses = (responsesRes.data ?? []) as Array<{
      id: string;
      question_id: string;
      answer: AnswerValue | null;
      notes: string | null;
      updated_at: string;
      created_at: string;
      created_by: string | null;
      is_not_applicable: boolean | null;
    }>;

    const bindingByQuestion = new Map<string, unknown>();
    const naScenarioQuestions = new Set<string>();
    for (const row of bindingsRes.data ?? []) {
      const r = row as { question_id: string; metric?: unknown; bindings?: unknown };
      bindingByQuestion.set(r.question_id, r.metric);
      // Sinaliza perguntas elegiveis ao cenario `nao_se_aplica` (hint UI).
      const bindings = r.bindings as Record<string, unknown> | null;
      if (bindings && typeof bindings === "object" && bindings.nao_se_aplica) {
        naScenarioQuestions.add(r.question_id);
      }
    }

    const waiverByQuestion = new Map<string, string | null>();
    for (const row of waiversRes.data ?? []) {
      const r = row as { question_id: string; reason: string | null };
      waiverByQuestion.set(r.question_id, r.reason ?? null);
    }

    // Evidencias + ultima validacao por evidencia (para status individual).
    const responseIds = responses.map((r) => r.id);
    const evidencesRes =
      responseIds.length > 0
        ? await this.supabase
            .from("evidences")
            .select(
              "id,response_id,title,description,external_link,storage_path",
            )
            .in("response_id", responseIds)
        : { data: [], error: null };
    if (evidencesRes.error) throw evidencesRes.error;

    const evidences = (evidencesRes.data ?? []) as Array<{
      id: string;
      response_id: string;
      title: string;
      description: string | null;
      external_link: string | null;
      storage_path: string | null;
    }>;

    const evidenceIds = evidences.map((e) => e.id);
    const validationsRes =
      evidenceIds.length > 0
        ? await this.supabase
            .from("evidence_validations")
            .select("evidence_id,status,validated_at")
            .in("evidence_id", evidenceIds)
            .order("validated_at", { ascending: false })
        : { data: [], error: null };
    if (validationsRes.error) throw validationsRes.error;

    const latestValidationByEvidence = new Map<string, string>();
    for (const row of validationsRes.data ?? []) {
      const r = row as { evidence_id: string; status: string };
      if (!latestValidationByEvidence.has(r.evidence_id)) {
        latestValidationByEvidence.set(r.evidence_id, r.status);
      }
    }
    const evidenceByResponse = new Map<string, (typeof evidences)[number]>();
    for (const e of evidences) {
      if (!evidenceByResponse.has(e.response_id)) {
        evidenceByResponse.set(e.response_id, e);
      }
    }

    const hasComplementationRequested = Array.from(
      latestValidationByEvidence.values(),
    ).some((s) => s === "adjustment_requested");

    const responseByQuestion = new Map(
      responses.map((r) => [r.question_id, r] as const),
    );

    // Resolve nomes dos usuarios contribuidores.
    const userIds = new Set<string>();
    for (const r of responses) {
      if (r.created_by) userIds.add(r.created_by);
    }
    const userNames = await this.loadUserNames(Array.from(userIds));

    const answers: RespondentAnswerCell[] = orderedQuestions.map((q) => {
      const response = responseByQuestion.get(q.id);
      const evidence = response ? evidenceByResponse.get(response.id) : undefined;
      const validationStatus = evidence
        ? latestValidationByEvidence.get(evidence.id) ?? null
        : null;
      const isWaived = waiverByQuestion.has(q.id);
      const waiverReason = isWaived ? waiverByQuestion.get(q.id) ?? null : null;
      const isNotApplicable = response?.is_not_applicable === true;
      return {
        questionId: q.id,
        orderIndex: q.orderIndex,
        prompt: q.prompt,
        answerType: normalizeAnswerType(bindingByQuestion.get(q.id)),
        answer: response?.answer ?? null,
        notes: response?.notes ?? null,
        updatedAt: response?.updated_at ?? null,
        createdByUserId: response?.created_by ?? null,
        createdByName: response?.created_by
          ? userNames.get(response.created_by) ?? null
          : null,
        isWaived,
        waiverReason,
        isNotApplicable,
        hasNotApplicableScenario: naScenarioQuestions.has(q.id),
        evidence: evidence
          ? {
              id: evidence.id,
              title: evidence.title,
              description: evidence.description,
              externalLink: evidence.external_link,
              storagePath: evidence.storage_path,
              validationStatus,
            }
          : null,
      } satisfies RespondentAnswerCell;
    });

    const contributorMap = new Map<string, number>();
    for (const r of responses) {
      if (!r.created_by) continue;
      contributorMap.set(
        r.created_by,
        (contributorMap.get(r.created_by) ?? 0) + 1,
      );
    }
    const contributors: RespondentContributor[] = Array.from(
      contributorMap.entries(),
    )
      .map(([userId, contributions]) => ({
        userId,
        fullName: userNames.get(userId) ?? null,
        contributions,
      }))
      .sort((a, b) => b.contributions - a.contributions);

    const answeredQuestions = responses.length;
    const totalQuestions = orderedQuestions.length;
    const lastUpdatedAt = responses.reduce<string | null>((acc, r) => {
      if (!acc) return r.updated_at;
      return Date.parse(r.updated_at) > Date.parse(acc) ? r.updated_at : acc;
    }, null);
    const firstAnsweredAt = responses.reduce<string | null>((acc, r) => {
      if (!acc) return r.created_at;
      return Date.parse(r.created_at) < Date.parse(acc) ? r.created_at : acc;
    }, null);

    const status = deriveRespondentStatus({
      answered: answeredQuestions,
      total: totalQuestions,
      hasSubmission: (famiRes.data ?? []).length > 0,
      hasComplementationRequested,
    });

    const waivedQuestions = waiverByQuestion.size;
    const notApplicableResponses = responses.filter(
      (r) => r.is_not_applicable === true,
    ).length;
    const applicableQuestions = Math.max(
      0,
      totalQuestions - waivedQuestions - notApplicableResponses,
    );

    return {
      organizationId,
      organizationName: (orgRes.data.name as string) ?? "",
      status,
      answeredQuestions,
      totalQuestions,
      waivedQuestions,
      applicableQuestions,
      lastUpdatedAt,
      firstAnsweredAt,
      contributors,
      answers,
    };
  }

  // -- Helpers internos --------------------------------------------------

  private async loadFormBasic(
    formId: string,
  ): Promise<{ id: string; name: string; state: string }> {
    const { data, error } = await this.supabase
      .from("forms")
      .select("id,name,state")
      .eq("id", formId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new FormsNotFoundError("Formulario nao encontrado.");
    return data as { id: string; name: string; state: string };
  }

  private async loadFormQuestionIds(formId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("form_questions")
      .select("question_id")
      .eq("form_id", formId);
    if (error) throw error;
    return (data ?? []).map((r) => (r as { question_id: string }).question_id);
  }

  private async loadOrderedQuestions(
    formId: string,
  ): Promise<{ id: string; prompt: string; orderIndex: number }[]> {
    const { data: links, error: linksErr } = await this.supabase
      .from("form_questions")
      .select("question_id, order_index")
      .eq("form_id", formId)
      .order("order_index", { ascending: true });
    if (linksErr) throw linksErr;

    const orderedIds = (links ?? []).map(
      (l) => (l as { question_id: string }).question_id,
    );
    if (orderedIds.length === 0) return [];

    const { data: rows, error: qErr } = await this.supabase
      .from("questions")
      .select("id, prompt")
      .in("id", orderedIds);
    if (qErr) throw qErr;

    const promptById = new Map<string, string>();
    for (const r of rows ?? []) {
      promptById.set(
        (r as { id: string }).id,
        (r as { prompt: string }).prompt,
      );
    }

    return (links ?? []).flatMap((row, index) => {
      const l = row as { question_id: string; order_index: number };
      const prompt = promptById.get(l.question_id);
      if (typeof prompt !== "string") return [];
      return [
        {
          id: l.question_id,
          prompt,
          orderIndex: typeof l.order_index === "number" ? l.order_index : index,
        },
      ];
    });
  }

  private async loadOrganizationNames(
    ids: string[],
  ): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from("organizations")
      .select("id,name")
      .in("id", ids);
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of data ?? []) {
      const r = row as { id: string; name: string };
      map.set(r.id, r.name);
    }
    return map;
  }

  private async loadUserNames(ids: string[]): Promise<Map<string, string>> {
    if (ids.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    if (error) throw error;
    const map = new Map<string, string>();
    for (const row of data ?? []) {
      const r = row as { user_id: string; full_name: string | null };
      if (r.full_name) map.set(r.user_id, r.full_name);
    }
    return map;
  }

  private async countContributorsByOrg(
    formId: string,
    orgIds: string[],
  ): Promise<Map<string, number>> {
    if (orgIds.length === 0) return new Map();
    const { data, error } = await this.supabase
      .from("responses")
      .select("organization_id, created_by")
      .eq("form_id", formId)
      .in("organization_id", orgIds);
    if (error) throw error;
    const byOrg = new Map<string, Set<string>>();
    for (const row of data ?? []) {
      const r = row as { organization_id: string; created_by: string | null };
      if (!r.created_by) continue;
      const set = byOrg.get(r.organization_id) ?? new Set<string>();
      set.add(r.created_by);
      byOrg.set(r.organization_id, set);
    }
    const counts = new Map<string, number>();
    for (const [orgId, set] of byOrg) counts.set(orgId, set.size);
    return counts;
  }

  /**
   * Caminha pelas respostas do formulario e devolve, para cada orgao com pelo
   * menos uma resposta:
   *  - answeredQuestions (distinct question_id)
   *  - lastUpdatedAt
   *  - hasSubmission (existe `fami_results`)
   *  - hasComplementationRequested (alguma evidencia da org+form com
   *    validacao mais recente = `adjustment_requested`)
   *
   * Tambem retorna o `lastAnswerAt` global e o tamanho.
   *
   * Quando `organizationId` esta no filtro, restringe a consulta inteira.
   */
  private async collectOrganizationStats(
    formId: string,
    questionIds: string[],
    options: { organizationId?: string | null } = {},
  ): Promise<{
    byOrg: Map<
      string,
      {
        answeredQuestions: number;
        lastUpdatedAt: string;
        hasSubmission: boolean;
        hasComplementationRequested: boolean;
      }
    >;
    lastAnswerAt: string | null;
    size: number;
  }> {
    let responsesQuery = this.supabase
      .from("responses")
      .select("id, organization_id, question_id, updated_at")
      .eq("form_id", formId);
    if (options.organizationId) {
      responsesQuery = responsesQuery.eq("organization_id", options.organizationId);
    }
    if (questionIds.length > 0) {
      // Garante que perguntas removidas nao falseiem o `answered`.
      responsesQuery = responsesQuery.in("question_id", questionIds);
    }
    const { data: responses, error: respErr } = await responsesQuery;
    if (respErr) throw respErr;

    const responseRows = (responses ?? []) as Array<{
      id: string;
      organization_id: string;
      question_id: string;
      updated_at: string;
    }>;

    const responseIdsByOrg = new Map<string, string[]>();
    const questionSetByOrg = new Map<string, Set<string>>();
    const latestUpdateByOrg = new Map<string, string>();
    let lastAnswerAt: string | null = null;

    for (const row of responseRows) {
      const orgId = row.organization_id;
      const list = responseIdsByOrg.get(orgId) ?? [];
      list.push(row.id);
      responseIdsByOrg.set(orgId, list);

      const set = questionSetByOrg.get(orgId) ?? new Set<string>();
      set.add(row.question_id);
      questionSetByOrg.set(orgId, set);

      const current = latestUpdateByOrg.get(orgId);
      if (!current || Date.parse(row.updated_at) > Date.parse(current)) {
        latestUpdateByOrg.set(orgId, row.updated_at);
      }
      if (!lastAnswerAt || Date.parse(row.updated_at) > Date.parse(lastAnswerAt)) {
        lastAnswerAt = row.updated_at;
      }
    }

    const orgIds = Array.from(responseIdsByOrg.keys());

    let famiQuery = this.supabase
      .from("fami_results")
      .select("organization_id")
      .eq("form_id", formId);
    if (options.organizationId) {
      famiQuery = famiQuery.eq("organization_id", options.organizationId);
    } else if (orgIds.length > 0) {
      famiQuery = famiQuery.in("organization_id", orgIds);
    }
    const { data: famiRows, error: famiErr } = await famiQuery;
    if (famiErr) throw famiErr;
    const submittedOrgs = new Set<string>();
    for (const row of famiRows ?? []) {
      submittedOrgs.add((row as { organization_id: string }).organization_id);
    }

    // Para detectar `em_complementacao`, precisamos das evidencias do conjunto
    // de respostas e da ultima validacao por evidencia.
    const allResponseIds = responseRows.map((r) => r.id);
    const complementationOrgs = new Set<string>();
    if (allResponseIds.length > 0) {
      const { data: evRows, error: evErr } = await this.supabase
        .from("evidences")
        .select("id, response_id")
        .in("response_id", allResponseIds);
      if (evErr) throw evErr;
      const evRowsTyped = (evRows ?? []) as Array<{
        id: string;
        response_id: string;
      }>;

      if (evRowsTyped.length > 0) {
        const evIds = evRowsTyped.map((e) => e.id);
        const { data: valRows, error: valErr } = await this.supabase
          .from("evidence_validations")
          .select("evidence_id, status, validated_at")
          .in("evidence_id", evIds)
          .order("validated_at", { ascending: false });
        if (valErr) throw valErr;
        const latestByEvidence = new Map<string, string>();
        for (const row of valRows ?? []) {
          const r = row as { evidence_id: string; status: string };
          if (!latestByEvidence.has(r.evidence_id)) {
            latestByEvidence.set(r.evidence_id, r.status);
          }
        }
        const responseOrgById = new Map<string, string>();
        for (const r of responseRows) responseOrgById.set(r.id, r.organization_id);

        for (const ev of evRowsTyped) {
          const status = latestByEvidence.get(ev.id);
          if (status === "adjustment_requested") {
            const orgId = responseOrgById.get(ev.response_id);
            if (orgId) complementationOrgs.add(orgId);
          }
        }
      }
    }

    const byOrg = new Map<
      string,
      {
        answeredQuestions: number;
        lastUpdatedAt: string;
        hasSubmission: boolean;
        hasComplementationRequested: boolean;
      }
    >();

    for (const orgId of orgIds) {
      byOrg.set(orgId, {
        answeredQuestions: questionSetByOrg.get(orgId)?.size ?? 0,
        lastUpdatedAt: latestUpdateByOrg.get(orgId) ?? new Date(0).toISOString(),
        hasSubmission: submittedOrgs.has(orgId),
        hasComplementationRequested: complementationOrgs.has(orgId),
      });
    }

    return { byOrg, lastAnswerAt, size: byOrg.size };
  }
}

/** Helper de parse compartilhado pelas rotas/API (avoid `any`). */
export function parseStatusFilter(raw: string | null): RespondentStatus | null {
  if (!raw) return null;
  if ((RESPONDENT_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as RespondentStatus;
  }
  throw new FormsValidationError([
    { path: "status", message: "Status invalido." },
  ]);
}
