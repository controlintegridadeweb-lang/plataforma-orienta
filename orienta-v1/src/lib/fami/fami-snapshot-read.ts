import "server-only";

import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { fetchScopeDisplayNames } from "@/lib/workbench/resolve-question-structure";
import type { AxisMaturity } from "@/lib/fami/types";
import { sortAxesMaturity } from "@/lib/fami/fami-axis-display";

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

function getClient(): Client {
  return createSupabaseServiceRoleClient();
}

export type FamiGlobalReadout = {
  percentage: number;
  maturityLevel: number;
  pointsObtained: number;
  pointsPossible: number;
  createdAt: string;
};

/**
 * Última `processing_version` global do par (form, org). Retorna `null` quando
 * não há snapshot. Usado pelo `fami-context` para resolver versão sem precisar
 * carregar o snapshot inteiro.
 */
export async function resolveLatestFamiVersionForFormOrg(
  formId: string,
  organizationId: string,
): Promise<number | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("processing_version")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data == null) return null;
  return Number(data.processing_version ?? 0);
}

/**
 * Linha global FAMI de um par (form, org, version). `null` quando não existe —
 * **não** sintetiza zeros artificiais.
 */
export async function loadFamiGlobalForVersion(
  formId: string,
  organizationId: string,
  processingVersion: number,
): Promise<FamiGlobalReadout | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("percentage,maturity_level,points_obtained,points_possible,created_at")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("processing_version", processingVersion)
    .eq("scope_type", "global")
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    percentage: Number(data.percentage ?? 0),
    maturityLevel: Number(data.maturity_level ?? 0),
    pointsObtained: Number(data.points_obtained ?? 0),
    pointsPossible: Number(data.points_possible ?? 0),
    createdAt: String(data.created_at ?? ""),
  };
}

/**
 * Maturidade por eixo de uma versão específica, com 3 eixos ordenados na
 * sequência institucional (Governanca → Ambiental → Social). Quando o snapshot
 * não tem linha de um eixo, ele entra como 0% — preserva a estrutura visual,
 * mas a leitura institucional “sem dado” deve usar `loadFamiGlobalForVersion`
 * antes para decidir se exibe o gráfico.
 */
export async function loadAxisMaturityForVersion(
  formId: string,
  organizationId: string,
  processingVersion: number,
): Promise<AxisMaturity[]> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("scope_id,percentage,maturity_level")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("processing_version", processingVersion)
    .eq("scope_type", "axis");
  if (error) throw error;

  const byAxisId = new Map<string, { percentage: number; maturityLevel: number }>();
  for (const row of data ?? []) {
    const axisId = row.scope_id as string | null;
    if (!axisId) continue;
    byAxisId.set(axisId, {
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
    });
  }

  const { data: axesCatalog, error: axesErr } = await client
    .from("axes")
    .select("id,name");
  if (axesErr) throw axesErr;

  const catalogAxisIds = (axesCatalog ?? []).map((a) => a.id as string);
  const allAxisIds = new Set<string>([...byAxisId.keys(), ...catalogAxisIds]);

  const { axisNames } = await fetchScopeDisplayNames(
    client,
    [],
    Array.from(allAxisIds),
  );

  const merged: AxisMaturity[] = (axesCatalog ?? []).map((row) => {
    const axisId = row.id as string;
    const fromSnapshot = byAxisId.get(axisId);
    return {
      axisId,
      axisName: (row.name as string) ?? axisNames.get(axisId) ?? axisId.slice(0, 8),
      percentage: fromSnapshot?.percentage ?? 0,
      maturityLevel: fromSnapshot?.maturityLevel ?? 0,
    };
  });

  return sortAxesMaturity(merged);
}

/**
 * Atalho: `null` quando não há FAMI; senão devolve eixos ordenados completos
 * (3 quando catálogo tem 3 eixos).
 */
export async function loadMaturityByAxisForOrganization(
  formId: string,
  organizationId: string,
  processingVersion: number,
): Promise<AxisMaturity[] | null> {
  const global = await loadFamiGlobalForVersion(formId, organizationId, processingVersion);
  if (!global) return null;
  return loadAxisMaturityForVersion(formId, organizationId, processingVersion);
}

/**
 * Agrega eixos entre organizações **pulando** orgs sem FAMI. Nível derivado do
 * percentual médio (não média de níveis). Retorna `null` quando nenhuma org tem
 * snapshot.
 */
export async function aggregateMaturityByAxisAcrossOrganizations(args: {
  formId?: string;
  organizationIds: string[];
  perOrgVersion: Map<string, number>;
}): Promise<AxisMaturity[] | null> {
  const { perOrgVersion, formId } = args;
  if (perOrgVersion.size === 0) return null;

  const client = getClient();
  const orgIds = Array.from(perOrgVersion.keys());
  const versionsByOrg = perOrgVersion;

  let query = client
    .from("fami_results")
    .select("organization_id,processing_version,scope_id,percentage,maturity_level")
    .in("organization_id", orgIds)
    .eq("scope_type", "axis");
  if (formId) {
    query = query.eq("form_id", formId);
  }
  const { data, error } = await query;
  if (error) throw error;

  const acc = new Map<string, { sum: number; count: number }>();
  for (const row of data ?? []) {
    const orgId = row.organization_id as string;
    const version = Number(row.processing_version ?? 0);
    if (versionsByOrg.get(orgId) !== version) continue;
    const axisId = row.scope_id as string | null;
    if (!axisId) continue;
    const cur = acc.get(axisId) ?? { sum: 0, count: 0 };
    cur.sum += Number(row.percentage ?? 0);
    cur.count += 1;
    acc.set(axisId, cur);
  }

  if (acc.size === 0) return null;

  const axisIds = Array.from(acc.keys());
  const { data: axesCatalog } = await client
    .from("axes")
    .select("id,name")
    .in("id", axisIds);
  const nameByAxisId = new Map<string, string>(
    (axesCatalog ?? []).map((a) => [a.id as string, (a.name as string) ?? ""]),
  );

  const { levelFromPercentage } = await import("@/lib/fami/fami-axis-display");
  const merged: AxisMaturity[] = axisIds.map((axisId) => {
    const { sum, count } = acc.get(axisId)!;
    const percentage = Number((sum / count).toFixed(2));
    return {
      axisId,
      axisName: nameByAxisId.get(axisId) ?? axisId.slice(0, 8),
      percentage,
      maturityLevel: levelFromPercentage(percentage),
    };
  });
  return sortAxesMaturity(merged);
}
