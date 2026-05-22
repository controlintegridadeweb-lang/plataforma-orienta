import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AxisMaturity } from "@/lib/fami/types";
import {
  resolveLatestFamiContextForOrganization,
  resolveYearEndFamiContextForOrganization,
  getAvailableFamiYears,
} from "@/lib/fami/queries";
import {
  loadMaturityByAxisForOrganization,
  aggregateMaturityByAxisAcrossOrganizations,
} from "@/lib/fami/fami-snapshot-read";
import { sortAxesMaturity } from "@/lib/fami/fami-axis-display";
import { brtYearUtcBounds } from "@/lib/fami/fami-year";
import { shouldShowFormOnRespondentDashboardForYear } from "@/lib/dashboards/respondent-form-year-scope";
/**
 * Estados em que o formulario aparece para o respondente preencher ou acompanhar.
 * Coerente com a UX de publicacao: rascunhos (draft) e encerrados (closed)
 * NAO sao expostos ao respondente. So aparece o que esta publicado e em uso.
 */
export const RESPONDENT_VISIBLE_FORM_STATES = [
  "submitted",
  "under_review",
  "complementation_requested",
  "resubmitted",
  "consolidated",
] as const;

export function isFormOpenForRespondent(state: string): boolean {
  return (RESPONDENT_VISIBLE_FORM_STATES as readonly string[]).includes(state);
}

/**
 * Estados considerados "ativos" para os KPIs administrativos.
 * Coerente com a UX de publicacao da lista de formularios:
 * - draft   = rascunho (nao publicado) -> nao conta
 * - closed  = encerrado -> nao conta
 * - demais  = publicado e ainda em uso (submitted/under_review/.../consolidated)
 *
 * Tambem exige archived_at IS NULL na consulta (formulario nao arquivado).
 */
export const ACTIVE_FORM_STATES = [
  "submitted",
  "under_review",
  "complementation_requested",
  "resubmitted",
  "consolidated",
] as const;

export type { AxisMaturity } from "@/lib/fami/types";

export type EvidenceStatusBreakdown = Record<string, number>;

export type RecentActivity = {
  id: string;
  eventType: string;
  tableName: string | null;
  createdAt: string;
  actorEmail: string | null;
};

export type PendencyItem = {
  id: string;
  title: string;
  description: string;
  href?: string;
};

export type RespondentProgress = {
  formId: string;
  formName: string;
  state: string;
  totalQuestions: number;
  answeredQuestions: number;
  complementationRequests: number;
};

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

function getClient(): Client {
  return createSupabaseServiceRoleClient();
}

/**
 * Formularios ativos = publicados e ainda em uso (nao rascunho, nao encerrado, nao arquivado).
 * Coeso com o badge "Publicado" da lista de formularios.
 */
export async function countActiveForms(): Promise<number> {
  const { count } = await getClient()
    .from("forms")
    .select("id", { count: "exact", head: true })
    .in("state", [...ACTIVE_FORM_STATES])
    .is("archived_at", null);
  return count ?? 0;
}

/** Total de perfis com acesso à plataforma (dashboard admin / sistema). */
export async function countProfiles(): Promise<number> {
  const { count } = await getClient()
    .from("profiles")
    .select("user_id", { count: "exact", head: true });
  return count ?? 0;
}

/** Relatórios oficiais gerados e persistidos em `reports`. */
export async function countReportsGenerated(): Promise<number> {
  const { count } = await getClient()
    .from("reports")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function countPendingEvidencesGlobal(): Promise<number> {
  const client = getClient();
  const { data: responses } = await client.from("responses").select("id");
  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return 0;

  const { data: evidences } = await client
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);
  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return 0;

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const evidenceId = row.evidence_id as string;
    if (!latestByEvidence.has(evidenceId)) {
      latestByEvidence.set(evidenceId, row.status as string);
    }
  }

  let pending = 0;
  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid);
    if (!status || status === "pending" || status === "complementation_requested") {
      pending += 1;
    }
  }
  return pending;
}

export async function countRecommendationsGlobal(): Promise<number> {
  const { count } = await getClient()
    .from("recommendations")
    .select("id", { count: "exact", head: true });
  return count ?? 0;
}

export async function countActionPlansByStatusGlobal(): Promise<Record<string, number>> {
  const client = getClient();
  const { data: plans } = await client.from("action_plans").select("status");
  const breakdown: Record<string, number> = {};
  for (const row of plans ?? []) {
    const key = String(row.status ?? "unknown");
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }
  return breakdown;
}

export async function evidenceStatusBreakdownGlobal(): Promise<EvidenceStatusBreakdown> {
  const client = getClient();
  const { data: responses } = await client.from("responses").select("id");
  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return {};

  const { data: evidences } = await client
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);
  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return { sem_evidencia: 0 };

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const id = row.evidence_id as string;
    if (!latestByEvidence.has(id)) latestByEvidence.set(id, row.status as string);
  }

  const breakdown: EvidenceStatusBreakdown = {};
  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid) ?? "pending";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }
  return breakdown;
}

/**
 * Maturidade por eixo agregada entre todas as organizacoes: media simples
 * pulando organizacoes **sem snapshot FAMI**. Nivel derivado do percentual
 * agregado via `levelFromPercentage` (alinhado a `calculateLevel`).
 */
export async function maturityByAxisGlobal(
  snapshotYear?: number | null,
): Promise<AxisMaturity[]> {
  const client = getClient();
  const { data: orgs } = await client.from("organizations").select("id");
  if (!orgs?.length) return [];

  const perOrgVersion = new Map<string, number>();
  let formId: string | undefined;
  for (const org of orgs) {
    const orgId = org.id as string;
    const ctx =
      snapshotYear != null
        ? await resolveYearEndFamiContextForOrganization(orgId, snapshotYear)
        : await resolveLatestFamiContextForOrganization(orgId);
    if (!ctx) continue;
    perOrgVersion.set(orgId, ctx.processingVersion);
    if (!formId) formId = ctx.formId;
  }
  if (perOrgVersion.size === 0) return [];

  const aggregated = await aggregateMaturityByAxisAcrossOrganizations({
    formId,
    organizationIds: Array.from(perOrgVersion.keys()),
    perOrgVersion,
  });
  return aggregated ?? [];
}

export async function adminPendenciesGlobal(limit = 8): Promise<PendencyItem[]> {
  const client = getClient();
  const { data: recs } = await client.from("recommendations").select("id,original_text,status");
  const recIds = (recs ?? []).map((r) => r.id as string);
  const recTextById = new Map<string, string>(
    (recs ?? []).map((r) => [r.id as string, (r.original_text as string) ?? ""]),
  );

  const withPlanIds = new Set<string>();
  if (recIds.length > 0) {
    const { data: plans } = await client
      .from("action_plans")
      .select("recommendation_id")
      .in("recommendation_id", recIds);
    for (const p of plans ?? []) withPlanIds.add(p.recommendation_id as string);
  }

  const withoutPlan: PendencyItem[] = [];
  for (const r of recs ?? []) {
    const id = r.id as string;
    if (!withPlanIds.has(id) && r.status !== "closed") {
      withoutPlan.push({
        id,
        title: "Recomendacao sem plano de acao",
        description: recTextById.get(id) ?? "Recomendacao pendente de plano.",
        href: "/admin/plano-acao",
      });
    }
  }

  return withoutPlan.slice(0, limit);
}

export async function countPendingEvidences(organizationId: string): Promise<number> {
  const client = getClient();
  const { data: responses } = await client
    .from("responses")
    .select("id")
    .eq("organization_id", organizationId);
  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return 0;

  const { data: evidences } = await client
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);
  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return 0;

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const evidenceId = row.evidence_id as string;
    if (!latestByEvidence.has(evidenceId)) {
      latestByEvidence.set(evidenceId, row.status as string);
    }
  }

  let pending = 0;
  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid);
    if (!status || status === "pending" || status === "complementation_requested") {
      pending += 1;
    }
  }
  return pending;
}

export async function countRecommendations(
  organizationId: string,
  options: { excludeStatuses?: string[] } = {},
): Promise<number> {
  const exclude = options.excludeStatuses ?? [];
  let query = getClient()
    .from("recommendations")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (exclude.length > 0) {
    query = query.not("status", "in", `(${exclude.map((s) => `"${s}"`).join(",")})`);
  }
  const { count } = await query;
  return count ?? 0;
}

export async function countActionPlansByStatus(organizationId: string): Promise<Record<string, number>> {
  const client = getClient();
  const { data: recs } = await client
    .from("recommendations")
    .select("id")
    .eq("organization_id", organizationId);
  const ids = (recs ?? []).map((r) => r.id as string);
  if (ids.length === 0) return {};

  const { data: plans } = await client
    .from("action_plans")
    .select("status")
    .in("recommendation_id", ids);

  const breakdown: Record<string, number> = {};
  for (const row of plans ?? []) {
    const key = String(row.status ?? "unknown");
    breakdown[key] = (breakdown[key] ?? 0) + 1;
  }
  return breakdown;
}

/**
 * Maturidade por eixo no dashboard: usa o ultimo snapshot FAMI ou o fechamento
 * de um ano civil (BRT). O mesmo formulario base do resolver mais recente.
 * Quando a organizacao nao tem snapshot, retorna lista vazia (UI deve mostrar
 * estado "sem dado", sem zeros artificiais que distorcem a media).
 */
export async function maturityByAxis(
  organizationId: string,
  options?: { closingYear?: number | null },
): Promise<AxisMaturity[]> {
  const yr = options?.closingYear ?? undefined;
  const ctx =
    yr != null
      ? await resolveYearEndFamiContextForOrganization(organizationId, yr)
      : await resolveLatestFamiContextForOrganization(organizationId);
  if (!ctx) return [];
  const axes = await loadMaturityByAxisForOrganization(
    ctx.formId,
    organizationId,
    ctx.processingVersion,
  );
  return axes ? sortAxesMaturity(axes) : [];
}

/** Anos com processamentos globais (para filtro na UI do dashboard da mesma forma base). */
export async function maturityDashboardAvailableYearsForOrganization(
  organizationId: string,
): Promise<number[]> {
  const baseline = await resolveLatestFamiContextForOrganization(organizationId);
  if (!baseline) return [];
  return getAvailableFamiYears(baseline.formId, organizationId);
}

export async function evidenceStatusBreakdown(
  organizationId: string,
): Promise<EvidenceStatusBreakdown> {
  const client = getClient();
  const { data: responses } = await client
    .from("responses")
    .select("id")
    .eq("organization_id", organizationId);
  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return {};

  const { data: evidences } = await client
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);
  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return { sem_evidencia: 0 };

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const id = row.evidence_id as string;
    if (!latestByEvidence.has(id)) latestByEvidence.set(id, row.status as string);
  }

  const breakdown: EvidenceStatusBreakdown = {};
  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid) ?? "pending";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
  }
  return breakdown;
}

export async function recentActivities(limit = 8): Promise<RecentActivity[]> {
  const client = getClient();
  const { data: logs } = await client
    .from("audit_logs")
    .select("id,event_type,table_name,created_at,actor_id")
    .order("created_at", { ascending: false })
    .limit(limit);

  const actorIds = (logs ?? [])
    .map((l) => l.actor_id as string | null)
    .filter((id): id is string => typeof id === "string");
  const emailByActor = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: users } = await client.auth.admin.listUsers({ perPage: 200 });
    for (const u of users?.users ?? []) {
      if (u.id && u.email) emailByActor.set(u.id, u.email);
    }
  }

  return (logs ?? []).map((log) => ({
    id: log.id as string,
    eventType: log.event_type as string,
    tableName: (log.table_name as string | null) ?? null,
    createdAt: log.created_at as string,
    actorEmail: log.actor_id ? emailByActor.get(log.actor_id as string) ?? null : null,
  }));
}

export async function adminPendencies(organizationId: string): Promise<PendencyItem[]> {
  const client = getClient();

  const { data: recs } = await client
    .from("recommendations")
    .select("id,original_text,status")
    .eq("organization_id", organizationId);
  const recIds = (recs ?? []).map((r) => r.id as string);
  const recTextById = new Map<string, string>(
    (recs ?? []).map((r) => [r.id as string, (r.original_text as string) ?? ""]),
  );

  const withPlanIds = new Set<string>();
  if (recIds.length > 0) {
    const { data: plans } = await client
      .from("action_plans")
      .select("recommendation_id")
      .in("recommendation_id", recIds);
    for (const p of plans ?? []) withPlanIds.add(p.recommendation_id as string);
  }

  const withoutPlan: PendencyItem[] = [];
  for (const r of recs ?? []) {
    const id = r.id as string;
    if (!withPlanIds.has(id) && r.status !== "closed") {
      withoutPlan.push({
        id,
        title: "Recomendacao sem plano de acao",
        description: recTextById.get(id) ?? "Recomendacao pendente de plano.",
        href: `/admin/plano-acao?organizationId=${encodeURIComponent(organizationId)}`,
      });
    }
  }

  return withoutPlan.slice(0, 8);
}

export async function analystPendencies(organizationId: string): Promise<PendencyItem[]> {
  const client = getClient();
  const { data: responses } = await client
    .from("responses")
    .select("id,question_id")
    .eq("organization_id", organizationId);
  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return [];

  const { data: evidences } = await client
    .from("evidences")
    .select("id,title,response_id")
    .in("response_id", responseIds);
  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return [];

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const id = row.evidence_id as string;
    if (!latestByEvidence.has(id)) latestByEvidence.set(id, row.status as string);
  }

  const result: PendencyItem[] = [];
  for (const ev of evidences ?? []) {
    const id = ev.id as string;
    const status = latestByEvidence.get(id);
    if (!status || status === "pending") {
      result.push({
        id,
        title: "Evidencia aguardando validacao",
        description: (ev.title as string) ?? "Evidencia pendente.",
        href: "/analista/evidencias",
      });
    }
  }
  return result.slice(0, 8);
}

export type RespondentProgressPeriod = {
  year: number;
};

export async function respondentProgress(
  organizationId: string,
  period?: RespondentProgressPeriod,
): Promise<RespondentProgress[]> {
  const client = getClient();
  let periodBounds: { fromInclusive: string; toInclusive: string } | null = null;
  if (period) {
    periodBounds = brtYearUtcBounds(period.year);
  }

  const { data: forms } = await client
    .from("forms")
    .select("id,name,state,created_at")
    .in("state", [...RESPONDENT_VISIBLE_FORM_STATES])
    .is("archived_at", null);
  if (!forms || forms.length === 0) return [];

  const results: RespondentProgress[] = [];
  for (const form of forms) {
    const formId = form.id as string;
    const formCreatedAt = (form.created_at as string) ?? new Date(0).toISOString();

    const { count: totalEverResponses } = await client
      .from("responses")
      .select("id", { count: "exact", head: true })
      .eq("form_id", formId)
      .eq("organization_id", organizationId);

    const { count: totalQuestions } = await client
      .from("form_questions")
      .select("question_id", { count: "exact", head: true })
      .eq("form_id", formId);

    let answeredQuery = client
      .from("responses")
      .select("question_id")
      .eq("form_id", formId)
      .eq("organization_id", organizationId);
    if (periodBounds) {
      answeredQuery = answeredQuery
        .gte("updated_at", periodBounds.fromInclusive)
        .lte("updated_at", periodBounds.toInclusive);
    }
    const { data: answeredRows } = await answeredQuery;
    const answeredQuestions = new Set(
      (answeredRows ?? []).map((r) => r.question_id as string),
    ).size;

    let complementationRequests = 0;
    let validationsInPeriod = 0;
    const { data: orgResponses } = await client
      .from("responses")
      .select("id")
      .eq("form_id", formId)
      .eq("organization_id", organizationId);
    const respIds = (orgResponses ?? []).map((r) => r.id as string);
    if (respIds.length > 0) {
      const { data: evs } = await client
        .from("evidences")
        .select("id")
        .in("response_id", respIds);
      const evIds = (evs ?? []).map((e) => e.id as string);
      if (evIds.length > 0) {
        let valsQuery = client
          .from("evidence_validations")
          .select("evidence_id,status,validated_at")
          .in("evidence_id", evIds)
          .order("validated_at", { ascending: false });
        if (periodBounds) {
          valsQuery = valsQuery
            .gte("validated_at", periodBounds.fromInclusive)
            .lte("validated_at", periodBounds.toInclusive);
        }
        const { data: vals } = await valsQuery;
        validationsInPeriod = (vals ?? []).length;
        const latest = new Map<string, string>();
        for (const row of vals ?? []) {
          const id = row.evidence_id as string;
          if (!latest.has(id)) latest.set(id, row.status as string);
        }
        for (const status of latest.values()) {
          if (status === "complementation_requested") complementationRequests += 1;
        }
      }
    }

    if (period) {
      const visible = shouldShowFormOnRespondentDashboardForYear({
        periodYear: period.year,
        responsesUpdatedInPeriod: answeredQuestions,
        validationsInPeriod,
        totalResponsesEver: totalEverResponses ?? 0,
        formCreatedAtIso: formCreatedAt,
      });
      if (!visible) continue;
    }

    results.push({
      formId,
      formName: (form.name as string) ?? "",
      state: (form.state as string) ?? "draft",
      totalQuestions: totalQuestions ?? 0,
      answeredQuestions: answeredQuestions ?? 0,
      complementationRequests,
    });
  }
  return results;
}

export type OrganizationFormsGroup = {
  organizationId: string;
  organizationName: string;
  forms: RespondentProgress[];
};

/**
 * Lista formularios por organizacao (escopo global). Reaproveita
 * `respondentProgress` para o calculo de progresso por organizacao.
 */
export async function formsByOrganizationGlobal(): Promise<OrganizationFormsGroup[]> {
  const client = getClient();
  const { data: orgs } = await client
    .from("organizations")
    .select("id,name")
    .order("name", { ascending: true });
  if (!orgs?.length) return [];

  const groups: OrganizationFormsGroup[] = [];
  for (const org of orgs) {
    const organizationId = org.id as string;
    const organizationName = (org.name as string) ?? "";
    const forms = await respondentProgress(organizationId);
    groups.push({ organizationId, organizationName, forms });
  }
  return groups;
}

/**
 * Variante org-scoped de {@link formsByOrganizationGlobal}: retorna apenas
 * a organizacao informada. Usada pelo admin com `organization_id` vinculada
 * (apos a Fase 1 da remocao do perfil analista).
 */
export async function formsByOrganizationScoped(
  organizationId: string,
): Promise<OrganizationFormsGroup[]> {
  const client = getClient();
  const { data: org } = await client
    .from("organizations")
    .select("id,name")
    .eq("id", organizationId)
    .maybeSingle();
  if (!org) return [];
  const forms = await respondentProgress(organizationId);
  return [
    {
      organizationId: org.id as string,
      organizationName: (org.name as string) ?? "",
      forms,
    },
  ];
}

export async function analystRecentRecommendations(
  organizationId: string,
  limit = 5,
): Promise<Array<{ id: string; text: string; createdAt: string }>> {
  const client = getClient();
  const { data } = await client
    .from("recommendations")
    .select("id,original_text,created_at")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    text: (row.original_text as string) ?? "",
    createdAt: (row.created_at as string) ?? "",
  }));
}
