import { cache } from "react";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { EvidenceStatusBreakdown } from "./queries";

export type EvidenceMetrics = {
  pendingCount: number;
  breakdown: EvidenceStatusBreakdown;
};

const PENDING_STATUSES = new Set(["pending", "adjustment_requested"]);

function latestStatusByEvidence(
  validations: Array<{ evidence_id: string; status: string; validated_at: string }>,
): Map<string, string> {
  const latestByEvidence = new Map<string, string>();
  for (const row of validations) {
    const evidenceId = row.evidence_id;
    if (!latestByEvidence.has(evidenceId)) {
      latestByEvidence.set(evidenceId, row.status);
    }
  }
  return latestByEvidence;
}

/** Deriva contagem pendente e breakdown a partir do mapa de status mais recente. */
export function evidenceMetricsFromLatestStatuses(
  evidenceIds: string[],
  latestByEvidence: Map<string, string>,
): EvidenceMetrics {
  if (evidenceIds.length === 0) {
    return { pendingCount: 0, breakdown: { sem_evidencia: 0 } };
  }

  const breakdown: EvidenceStatusBreakdown = {};
  let pendingCount = 0;

  for (const eid of evidenceIds) {
    const status = latestByEvidence.get(eid) ?? "pending";
    breakdown[status] = (breakdown[status] ?? 0) + 1;
    if (!latestByEvidence.has(eid) || PENDING_STATUSES.has(status)) {
      pendingCount += 1;
    }
  }

  return { pendingCount, breakdown };
}

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

async function loadEvidenceIdsForResponses(
  client: Client,
  responseIds: string[],
): Promise<string[]> {
  if (responseIds.length === 0) return [];

  const { data: evidences } = await client
    .from("evidences")
    .select("id")
    .in("response_id", responseIds);
  return (evidences ?? []).map((e) => e.id as string);
}

async function loadLatestValidationStatuses(
  client: Client,
  evidenceIds: string[],
): Promise<Map<string, string>> {
  if (evidenceIds.length === 0) return new Map();

  const { data: validations } = await client
    .from("evidence_validations")
    .select("evidence_id,status,validated_at")
    .in("evidence_id", evidenceIds)
    .order("validated_at", { ascending: false });

  return latestStatusByEvidence(
    (validations ?? []).map((row) => ({
      evidence_id: row.evidence_id as string,
      status: row.status as string,
      validated_at: row.validated_at as string,
    })),
  );
}

async function computeEvidenceMetricsGlobalUncached(): Promise<EvidenceMetrics> {
  const client = createSupabaseServiceRoleClient();
  const { data: responses } = await client.from("responses").select("id");
  const responseIds = (responses ?? []).map((r) => r.id as string);
  const evidenceIds = await loadEvidenceIdsForResponses(client, responseIds);
  const latestByEvidence = await loadLatestValidationStatuses(client, evidenceIds);
  return evidenceMetricsFromLatestStatuses(evidenceIds, latestByEvidence);
}

async function computeEvidenceMetricsForOrganizationUncached(
  organizationId: string,
): Promise<EvidenceMetrics> {
  const client = createSupabaseServiceRoleClient();
  const { data: responses } = await client
    .from("responses")
    .select("id")
    .eq("organization_id", organizationId);
  const responseIds = (responses ?? []).map((r) => r.id as string);
  const evidenceIds = await loadEvidenceIdsForResponses(client, responseIds);
  const latestByEvidence = await loadLatestValidationStatuses(client, evidenceIds);
  return evidenceMetricsFromLatestStatuses(evidenceIds, latestByEvidence);
}

/** Uma passagem no banco por request (deduplicado via `cache`). */
export const getCachedEvidenceMetricsGlobal = cache(computeEvidenceMetricsGlobalUncached);

export const getCachedEvidenceMetricsForOrganization = cache(
  computeEvidenceMetricsForOrganizationUncached,
);
