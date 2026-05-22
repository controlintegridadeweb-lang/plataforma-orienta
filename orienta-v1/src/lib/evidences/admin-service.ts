import type { SupabaseClient } from "@supabase/supabase-js";
import type { ZodType } from "zod";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logInfo } from "@/lib/observability/logger";
import type { AppRole } from "@/lib/api/auth";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { aggregateKpiCounts } from "./status-groups";
import {
  evidenceExportFiltersSchema,
  evidenceStatsQuerySchema,
  listEvidencesQuerySchema,
  validateEvidenceSchema,
  type ListEvidencesQuery,
  type ValidationStatus,
} from "./schemas";

type Client = SupabaseClient;

type Caller = { role: AppRole; organizationId: string | null };

/**
 * Erros do dominio de evidencias. Traduzidos para 400/404/409 em
 * {@link ./http.ts}.
 */
export class EvidencesValidationError extends Error {
  issues: { path: string; message: string }[];
  constructor(issues: { path: string; message: string }[]) {
    super("Dados invalidos para evidencia.");
    this.name = "EvidencesValidationError";
    this.issues = issues;
  }
}

export class EvidencesNotFoundError extends Error {
  constructor(message = "Evidencia nao encontrada.") {
    super(message);
    this.name = "EvidencesNotFoundError";
  }
}

export class EvidencesConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EvidencesConflictError";
  }
}

// -- Tipos de saida --------------------------------------------------------

export type EvidenceListItem = {
  id: string;
  responseId: string;
  organizationId: string;
  organizationName: string;
  formId: string;
  formName: string;
  formVersion: number;
  questionId: string;
  questionPrompt: string;
  requiresEvidence: boolean;
  title: string;
  description: string;
  evidenceType: string;
  storagePath: string | null;
  externalLink: string | null;
  exceptionReason: string | null;
  submittedAt: string;
  submittedBy: string;
  currentStatus: ValidationStatus;
  lastValidatedAt: string | null;
  lastJustification: string | null;
  history: EvidenceValidationEntry[];
};

export type EvidenceValidationEntry = {
  id: string;
  status: ValidationStatus;
  justification: string | null;
  validatedBy: string;
  validatedAt: string;
};

export type EvidencesListResult = {
  items: EvidenceListItem[];
  total: number;
  limit: number;
  offset: number;
};

export type EvidenceStatsResult = {
  total: number;
  em_analise: number;
  aprovadas: number;
  rejeitadas: number;
};

export type EvidenceFilterOptions = {
  forms: { id: string; name: string; version: number }[];
  organizations: { id: string; name: string }[];
};

// -- Rows brutas que esperamos do Supabase --------------------------------

type EvidenceRowRaw = {
  id: string;
  response_id: string;
  title: string;
  description: string;
  evidence_type: string;
  storage_path: string | null;
  external_link: string | null;
  exception_reason: string | null;
  submitted_by: string;
  submitted_at: string;
  responses:
    | {
        id: string;
        form_id: string;
        organization_id: string;
        question_id: string;
      }
    | null;
};

type ValidationRowRaw = {
  id: string;
  evidence_id: string;
  status: ValidationStatus;
  justification: string | null;
  validated_by: string;
  validated_at: string;
};

type FormRow = { id: string; name: string; version: number; archived_at: string | null };
type OrgRow = { id: string; name: string };
type QuestionRow = { id: string; prompt: string; requires_evidence: boolean };

/**
 * Servico operacional para a aba de evidencias do admin.
 *
 * Estrategia de leitura: 1) traz as evidencias que casam com os filtros de
 * "fato" (form/organizacao), 2) traz o historico de validacoes dessas
 * evidencias, 3) reduz em memoria para derivar o `currentStatus` e aplicar
 * o filtro de status (que depende da linha mais recente). Para o volume
 * esperado de uma aba admin isso e adequado; caso cresca, evoluir para uma
 * view materializada com `distinct on (evidence_id)`.
 */
export class EvidencesAdminService {
  protected supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  // -- Listagem ----------------------------------------------------------

  async list(rawQuery: unknown, caller: Caller): Promise<EvidencesListResult> {
    const query = this.parse(listEvidencesQuerySchema, rawQuery);
    const base = await this.loadHydratedItems(caller, query);
    const narrowed = this.applyEvidenceQueryFilters(base, query);
    const filtered = query.status
      ? narrowed.filter((i) => i.currentStatus === query.status)
      : narrowed;
    const total = filtered.length;
    const paged = filtered.slice(query.offset, query.offset + query.limit);
    return { items: paged, total, limit: query.limit, offset: query.offset };
  }

  async getStats(rawQuery: unknown, caller: Caller): Promise<EvidenceStatsResult> {
    const query = this.parse(evidenceStatsQuerySchema, rawQuery);
    const base = await this.loadHydratedItems(caller, query);
    const narrowed = this.applyEvidenceQueryFilters(base, query);
    return aggregateKpiCounts(narrowed);
  }

  /**
   * Lista para exportacao CSV/PDF: respeita filtros + status, teto 1000 linhas.
   */
  async listForExport(rawQuery: unknown, caller: Caller): Promise<EvidenceListItem[]> {
    const query = this.parse(evidenceExportFiltersSchema, rawQuery);
    const base = await this.loadHydratedItems(caller, query);
    const narrowed = this.applyEvidenceQueryFilters(base, query);
    const filtered = query.status
      ? narrowed.filter((i) => i.currentStatus === query.status)
      : narrowed;
    return filtered.slice(0, 1000);
  }

  /**
   * Mesma estrategia 1-2-3 do list(): evidencias + validacoes + metadados.
   * Aplica apenas filtros de fato (org/form) vindos da query ou do perfil.
   */
  protected async loadHydratedItems(
    caller: Caller,
    query: Pick<ListEvidencesQuery, "formId" | "organizationId">,
  ): Promise<EvidenceListItem[]> {
    const effectiveOrgId = isGlobalAdmin(caller)
      ? query.organizationId
      : caller.organizationId ?? "__none__";

    let evidenceQuery = this.supabase
      .from("evidences")
      .select(
        `id, response_id, title, description, evidence_type, storage_path, external_link, exception_reason, submitted_by, submitted_at,
         responses:responses!inner(id, form_id, organization_id, question_id)`,
      )
      .order("submitted_at", { ascending: false });

    if (effectiveOrgId) {
      evidenceQuery = evidenceQuery.eq("responses.organization_id", effectiveOrgId);
    }
    if (query.formId) {
      evidenceQuery = evidenceQuery.eq("responses.form_id", query.formId);
    }

    const { data: evidencesRaw, error: evidenceError } = await evidenceQuery;
    if (evidenceError) throw evidenceError;

    const evidences = this.normalizeEvidences((evidencesRaw ?? []) as unknown[]);
    if (evidences.length === 0) return [];

    const evidenceIds = evidences.map((e) => e.id);
    const { data: validationsRaw, error: vErr } = await this.supabase
      .from("evidence_validations")
      .select("id, evidence_id, status, justification, validated_by, validated_at")
      .in("evidence_id", evidenceIds)
      .order("validated_at", { ascending: false });
    if (vErr) throw vErr;

    const historyByEvidence = new Map<string, EvidenceValidationEntry[]>();
    for (const row of (validationsRaw ?? []) as ValidationRowRaw[]) {
      const list = historyByEvidence.get(row.evidence_id) ?? [];
      list.push({
        id: row.id,
        status: row.status,
        justification: row.justification,
        validatedBy: row.validated_by,
        validatedAt: row.validated_at,
      });
      historyByEvidence.set(row.evidence_id, list);
    }

    const formIds = Array.from(new Set(evidences.map((e) => e.response.form_id)));
    const orgIds = Array.from(
      new Set(evidences.map((e) => e.response.organization_id)),
    );
    const qIds = Array.from(new Set(evidences.map((e) => e.response.question_id)));

    const [formsResp, orgsResp, qsResp] = await Promise.all([
      this.supabase
        .from("forms")
        .select("id, name, version, archived_at")
        .in("id", formIds),
      this.supabase.from("organizations").select("id, name").in("id", orgIds),
      this.supabase
        .from("questions")
        .select("id, prompt, requires_evidence")
        .in("id", qIds),
    ]);
    if (formsResp.error) throw formsResp.error;
    if (orgsResp.error) throw orgsResp.error;
    if (qsResp.error) throw qsResp.error;

    const formMap = new Map<string, FormRow>();
    for (const row of (formsResp.data ?? []) as FormRow[]) formMap.set(row.id, row);
    const orgMap = new Map<string, OrgRow>();
    for (const row of (orgsResp.data ?? []) as OrgRow[]) orgMap.set(row.id, row);
    const qMap = new Map<string, QuestionRow>();
    for (const row of (qsResp.data ?? []) as QuestionRow[]) qMap.set(row.id, row);

    return evidences.map((e) => {
      const history = historyByEvidence.get(e.id) ?? [];
      const latest = history[0];
      const currentStatus: ValidationStatus = latest?.status ?? "pending";
      const form = formMap.get(e.response.form_id);
      const org = orgMap.get(e.response.organization_id);
      const question = qMap.get(e.response.question_id);
      return {
        id: e.id,
        responseId: e.response.id,
        organizationId: e.response.organization_id,
        organizationName: org?.name ?? "(org removida)",
        formId: e.response.form_id,
        formName: form?.name ?? "(formulario removido)",
        formVersion: form?.version ?? 0,
        questionId: e.response.question_id,
        questionPrompt: question?.prompt ?? "(pergunta removida)",
        requiresEvidence: Boolean(question?.requires_evidence),
        title: e.title,
        description: e.description,
        evidenceType: e.evidence_type,
        storagePath: e.storage_path,
        externalLink: e.external_link,
        exceptionReason: e.exception_reason,
        submittedAt: e.submitted_at,
        submittedBy: e.submitted_by,
        currentStatus,
        lastValidatedAt: latest?.validatedAt ?? null,
        lastJustification: latest?.justification ?? null,
        history,
      };
    });
  }

  protected applyEvidenceQueryFilters(
    items: EvidenceListItem[],
    query: Pick<ListEvidencesQuery, "search" | "from" | "to" | "ids">,
  ): EvidenceListItem[] {
    let out = items;
    if (query.ids && query.ids.length > 0) {
      const allowed = new Set(query.ids);
      out = out.filter((i) => allowed.has(i.id));
    }
    if (query.search) {
      const needle = query.search.toLowerCase();
      out = out.filter((i) => {
        const blob = [
          i.title,
          i.description,
          i.questionPrompt,
          i.formName,
          i.organizationName,
          i.submittedBy,
        ]
          .join(" ")
          .toLowerCase();
        return blob.includes(needle);
      });
    }
    if (query.from) {
      const fromMs = new Date(query.from).getTime();
      out = out.filter((i) => new Date(i.submittedAt).getTime() >= fromMs);
    }
    if (query.to) {
      const toMs = new Date(query.to).getTime();
      out = out.filter((i) => new Date(i.submittedAt).getTime() <= toMs);
    }
    return out;
  }

  // -- Validacao ---------------------------------------------------------

  async validate(
    evidenceId: string,
    rawPayload: unknown,
    actorUserId: string,
  ): Promise<{
    entry: EvidenceValidationEntry;
    scope: { formId: string; organizationId: string } | null;
  }> {
    const payload = this.parse(validateEvidenceSchema, rawPayload);

    // Confirma que a evidencia existe e captura o escopo (form/org) para
    // que a rota possa reprocessar as recomendacoes em seguida. O tenant
    // guard e aplicado na rota; aqui so coletamos os ids.
    const { data: evidence, error } = await this.supabase
      .from("evidences")
      .select("id, responses:responses!inner(form_id, organization_id)")
      .eq("id", evidenceId)
      .maybeSingle();
    if (error) throw error;
    if (!evidence) throw new EvidencesNotFoundError();

    const justification = payload.justification?.trim();
    const persisted =
      payload.status === "waived"
        ? justification ?? null
        : justification && justification.length > 0
          ? justification
          : null;

    const { data: inserted, error: insertErr } = await this.supabase
      .from("evidence_validations")
      .insert({
        evidence_id: evidenceId,
        status: payload.status,
        justification: persisted,
        validated_by: actorUserId,
      })
      .select("id, status, justification, validated_by, validated_at")
      .single();
    if (insertErr) throw insertErr;

    logInfo("evidences.admin.validated", {
      evidenceId,
      status: payload.status,
      actorUserId,
    });

    const rel = (evidence as { responses?: unknown }).responses;
    const responseRow = Array.isArray(rel) ? rel[0] : rel;
    const scope =
      responseRow &&
      typeof responseRow === "object" &&
      typeof (responseRow as { form_id?: unknown }).form_id === "string" &&
      typeof (responseRow as { organization_id?: unknown }).organization_id === "string"
        ? {
            formId: (responseRow as { form_id: string }).form_id,
            organizationId: (responseRow as { organization_id: string }).organization_id,
          }
        : null;

    return {
      entry: {
        id: inserted.id as string,
        status: inserted.status as ValidationStatus,
        justification: (inserted.justification as string | null) ?? null,
        validatedBy: inserted.validated_by as string,
        validatedAt: inserted.validated_at as string,
      },
      scope,
    };
  }

  // -- Filtros -----------------------------------------------------------

  async listFilterOptions(caller: Caller): Promise<EvidenceFilterOptions> {
    // Forms: todos os ativos (nao arquivados). Inclui publicados/rascunhos
    // porque evidencias podem existir em qualquer estado.
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
    if (!isGlobalAdmin(caller)) {
      if (!caller.organizationId) {
        return {
          forms: (formsData ?? []) as FormRow[],
          organizations: [],
        };
      }
      orgsQuery = orgsQuery.eq("id", caller.organizationId);
    }
    const { data: orgsData, error: orgsErr } = await orgsQuery;
    if (orgsErr) throw orgsErr;

    return {
      forms: ((formsData ?? []) as FormRow[]).map((f) => ({
        id: f.id,
        name: f.name,
        version: f.version,
      })),
      organizations: (orgsData ?? []) as OrgRow[],
    };
  }

  // -- Internos ---------------------------------------------------------

  protected parse<T>(schema: ZodType<T>, input: unknown): T {
    const parsed = schema.safeParse(input);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => ({
        path: i.path.map((p) => String(p)).join(".") || "_",
        message: i.message,
      }));
      throw new EvidencesValidationError(
        issues.length > 0 ? issues : [{ path: "_", message: "Dados invalidos." }],
      );
    }
    return parsed.data;
  }

  /**
   * O PostgREST ora devolve a relacao como objeto, ora como array (dependendo
   * da versao/cardinalidade). Normalizamos para `{ response }` sempre como
   * objeto. Evidencias sem response valida sao descartadas.
   */
  protected normalizeEvidences(rows: unknown[]): Array<{
    id: string;
    response_id: string;
    title: string;
    description: string;
    evidence_type: string;
    storage_path: string | null;
    external_link: string | null;
    exception_reason: string | null;
    submitted_by: string;
    submitted_at: string;
    response: {
      id: string;
      form_id: string;
      organization_id: string;
      question_id: string;
    };
  }> {
    const out: ReturnType<EvidencesAdminService["normalizeEvidences"]> = [];
    for (const row of rows as EvidenceRowRaw[]) {
      const rel = row.responses;
      if (!rel) continue;
      const response = Array.isArray(rel) ? rel[0] : rel;
      if (!response) continue;
      out.push({
        id: row.id,
        response_id: row.response_id,
        title: row.title,
        description: row.description,
        evidence_type: row.evidence_type,
        storage_path: row.storage_path,
        external_link: row.external_link,
        exception_reason: row.exception_reason,
        submitted_by: row.submitted_by,
        submitted_at: row.submitted_at,
        response,
      });
    }
    return out;
  }
}
