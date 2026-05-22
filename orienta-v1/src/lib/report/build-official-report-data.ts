import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import { getCalendarYearBrt } from "@/lib/fami/fami-year";
import {
  getFamiEvolutionByYear,
  type FamiEvolutionYearPoint,
} from "@/lib/fami/queries";
import {
  loadAxisMaturityForVersion,
  loadFamiGlobalForVersion,
  resolveLatestFamiVersionForFormOrg,
} from "@/lib/fami/fami-snapshot-read";
import { buildFamiMaturityView } from "@/lib/fami/fami-maturity-view";
import { levelMeta } from "@/lib/fami/respondent-presentation";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { ActionPlanByFormPayload } from "@/lib/domain/action-plans";

export type ReportEvidenceSummary = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  complementation: number;
};

export type OfficialReportData = {
  organizationId: string;
  formId: string;
  organizationName: string;
  formName: string;
  processingVersion: number;
  referenceYear: number;
  famiProcessedAt: string;
  generatedAtIso: string;
  actionPlan: ActionPlanByFormPayload;
  fami: {
    global: { percentage: number; maturityLevel: number };
    byAxis: Array<{ axisName: string; percentage: number; maturityLevel: number }>;
  };
  evidence: ReportEvidenceSummary;
  evolution: FamiEvolutionYearPoint[];
  criticalAxesCount: number;
  advancedAxesCount: number;
  topOpportunityAxis: string | null;
  meta: {
    applicableQuestions: number;
    waivedQuestions: number;
    notApplicableResponses: number;
    isOfficialScore: boolean;
    formState: string;
    closedAt: string | null;
    responseDeadlineAt: string | null;
  };
};

async function loadEvidenceSummary(
  formId: string,
  organizationId: string,
): Promise<ReportEvidenceSummary> {
  const supabase = createSupabaseServiceRoleClient();
  const empty: ReportEvidenceSummary = {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    complementation: 0,
  };

  const { data: responses } = await supabase
    .from("responses")
    .select("id")
    .eq("form_id", formId)
    .eq("organization_id", organizationId);

  const responseIds = (responses ?? []).map((r) => r.id as string);
  if (responseIds.length === 0) return empty;

  const { data: evidences } = await supabase
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);

  const evidenceIds = (evidences ?? []).map((e) => e.id as string);
  if (evidenceIds.length === 0) return empty;

  const { data: validations } = await supabase
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  const latestByEvidence = new Map<string, string>();
  for (const row of validations ?? []) {
    const id = row.evidence_id as string;
    if (!latestByEvidence.has(id)) latestByEvidence.set(id, String(row.status ?? "pending"));
  }

  const summary = { ...empty, total: evidenceIds.length };
  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid) ?? "pending";
    if (status === "approved") summary.approved += 1;
    else if (status === "rejected") summary.rejected += 1;
    else if (status === "complementation_requested") summary.complementation += 1;
    else summary.pending += 1;
  }
  return summary;
}

/**
 * Payload canônico para PDF institucional: metadados, FAMI, plano, evidências e evolução.
 */
export async function loadOfficialReportData(params: {
  formId: string;
  organizationId: string;
  processingVersion?: number;
}): Promise<OfficialReportData | null> {
  const supabase = createSupabaseServiceRoleClient();

  const [{ data: org }, { data: form }] = await Promise.all([
    supabase.from("organizations").select("name").eq("id", params.organizationId).maybeSingle(),
    supabase
      .from("forms")
      .select("name,state,closed_at,response_deadline_at")
      .eq("id", params.formId)
      .maybeSingle(),
  ]);

  if (!org?.name || !form?.name) return null;

  const processingVersion =
    params.processingVersion ??
    (await resolveLatestFamiVersionForFormOrg(params.formId, params.organizationId));
  if (processingVersion == null) return null;

  const global = await loadFamiGlobalForVersion(
    params.formId,
    params.organizationId,
    processingVersion,
  );
  if (!global) return null;

  const famiProcessedAt = global.createdAt || new Date().toISOString();

  const [plansSvc, axisMaturity, evidence, evolution, view] = await Promise.all([
    Promise.resolve(new ActionPlansAdminService()),
    loadAxisMaturityForVersion(params.formId, params.organizationId, processingVersion),
    loadEvidenceSummary(params.formId, params.organizationId),
    getFamiEvolutionByYear(params.formId, params.organizationId),
    buildFamiMaturityView({
      kind: "form-org",
      formId: params.formId,
      organizationId: params.organizationId,
      processingVersion,
    }),
  ]);

  const actionPlanPayload = await plansSvc.getByForm(params.formId, params.organizationId, {
    role: "admin",
    organizationId: null,
  });

  if (!actionPlanPayload) return null;

  const byAxis = axisMaturity.map((a) => ({
    axisName: a.axisName,
    percentage: a.percentage,
    maturityLevel: a.maturityLevel,
  }));

  const criticalAxesCount = byAxis.filter((a) => a.percentage < 50).length;
  const advancedAxesCount = byAxis.filter((a) => a.percentage >= 75).length;

  const sortedAxes = [...byAxis].sort((a, b) => a.percentage - b.percentage);
  const bottom = sortedAxes[0];
  const topOpportunityAxis =
    bottom && sortedAxes.length > 1 && bottom.percentage < 75 ? bottom.axisName : null;

  const formState = String(form.state ?? "draft");
  return {
    organizationId: params.organizationId,
    formId: params.formId,
    organizationName: String(org.name),
    formName: String(form.name),
    processingVersion,
    referenceYear: getCalendarYearBrt(famiProcessedAt),
    famiProcessedAt,
    generatedAtIso: new Date().toISOString(),
    actionPlan: actionPlanPayload,
    fami: {
      global: {
        percentage: global.percentage,
        maturityLevel: global.maturityLevel,
      },
      byAxis,
    },
    evidence,
    evolution,
    criticalAxesCount,
    advancedAxesCount,
    topOpportunityAxis,
    meta: {
      applicableQuestions: view?.meta.applicableQuestions ?? 0,
      waivedQuestions: view?.meta.waivedQuestions ?? 0,
      notApplicableResponses: view?.meta.notApplicableResponses ?? 0,
      isOfficialScore: view?.meta.isOfficialScore ?? formState === "closed",
      formState,
      closedAt: (form.closed_at as string | null) ?? null,
      responseDeadlineAt: (form.response_deadline_at as string | null) ?? null,
    },
  };
}

/** Rótulo institucional do nível FAMI para o PDF. */
export function reportLevelLabel(level: number): string {
  return levelMeta(level).label;
}
