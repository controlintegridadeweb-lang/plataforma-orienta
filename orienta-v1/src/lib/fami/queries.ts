import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { pickBestGlobalPerBrtYear } from "@/lib/fami/fami-evolution-year-pick";
import { brtYearUtcBounds, getCalendarYearBrt } from "@/lib/fami/fami-year";
import { fetchScopeDisplayNames } from "@/lib/workbench/resolve-question-structure";
import { sortAxesMaturity, levelFromPercentage } from "@/lib/fami/fami-axis-display";
import type { AxisMaturity } from "./types";

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

function getClient(): Client {
  return createSupabaseServiceRoleClient();
}

export type FamiGlobalSnapshot = {
  percentage: number;
  maturityLevel: number;
  pointsObtained: number;
  pointsPossible: number;
  createdAt: string;
};

export type FamiSectionSnapshot = {
  sectionId: string;
  sectionName: string;
  percentage: number;
  maturityLevel: number;
  pointsObtained: number;
  pointsPossible: number;
};

export type FamiSnapshot = {
  formId: string;
  organizationId: string;
  processingVersion: number;
  global: FamiGlobalSnapshot | null;
  axes: AxisMaturity[];
  sections: FamiSectionSnapshot[];
};

export type FamiEvolutionPoint = {
  processingVersion: number;
  createdAt: string;
  globalPercentage: number | null;
  globalMaturityLevel: number | null;
  /** Eixo nome -> percentual */
  axisPercentages: Record<string, number>;
};

/** Um ponto por ano civil BRT: último processamento global daquele ano. */
export type FamiEvolutionYearPoint = {
  year: number;
  processingVersion: number;
  createdAt: string;
  globalPercentage: number | null;
  globalMaturityLevel: number | null;
  axisPercentages: Record<string, number>;
};

/**
 * Ultima linha global FAMI da organizacao (mais recente por created_at).
 * Usado pelo dashboard para fixar um unico par (formulario, versao) e evitar mistura entre formularios.
 */
export async function resolveLatestFamiContextForOrganization(
  organizationId: string,
): Promise<{ formId: string; processingVersion: number } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("form_id, processing_version, created_at")
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.form_id) return null;
  return {
    formId: data.form_id as string,
    processingVersion: Number(data.processing_version ?? 0),
  };
}

export async function getLatestFamiVersionForFormOrg(
  formId: string,
  organizationId: string,
): Promise<{ processingVersion: number; createdAt: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("processing_version, created_at")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data == null) return null;
  return {
    processingVersion: Number(data.processing_version ?? 0),
    createdAt: String(data.created_at ?? ""),
  };
}

export async function maturityByAxisForFormAndVersion(
  organizationId: string,
  formId: string,
  processingVersion: number,
): Promise<AxisMaturity[]> {
  const client = getClient();

  const { data: fami, error } = await client
    .from("fami_results")
    .select("scope_id,percentage,maturity_level")
    .eq("organization_id", organizationId)
    .eq("form_id", formId)
    .eq("processing_version", processingVersion)
    .eq("scope_type", "axis");
  if (error) throw error;

  const byAxisId = new Map<string, { percentage: number; maturity_level: number }>();
  for (const row of fami ?? []) {
    const axisId = row.scope_id as string | null;
    if (!axisId) continue;
    byAxisId.set(axisId, {
      percentage: Number(row.percentage ?? 0),
      maturity_level: Number(row.maturity_level ?? 0),
    });
  }

  const axisIds = Array.from(byAxisId.keys());
  if (axisIds.length === 0) return [];

  const { axisNames } = await fetchScopeDisplayNames(client, [], axisIds);
  const merged: AxisMaturity[] = axisIds.map((axisId) => {
    const latest = byAxisId.get(axisId)!;
    return {
      axisId,
      axisName: axisNames.get(axisId) ?? axisId.slice(0, 8),
      percentage: latest.percentage,
      maturityLevel: latest.maturity_level,
    };
  });
  return sortAxesMaturity(merged);
}

export async function buildFamiSnapshot(
  formId: string,
  organizationId: string,
  processingVersion: number,
): Promise<FamiSnapshot> {
  const client = getClient();

  const { data: globalRow, error: gErr } = await client
    .from("fami_results")
    .select(
      "percentage,maturity_level,points_obtained,points_possible,created_at",
    )
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("processing_version", processingVersion)
    .eq("scope_type", "global")
    .maybeSingle();
  if (gErr) throw gErr;

  const global: FamiGlobalSnapshot | null = globalRow
    ? {
        percentage: Number(globalRow.percentage ?? 0),
        maturityLevel: Number(globalRow.maturity_level ?? 0),
        pointsObtained: Number(globalRow.points_obtained ?? 0),
        pointsPossible: Number(globalRow.points_possible ?? 0),
        createdAt: String(globalRow.created_at ?? ""),
      }
    : null;

  const axes = sortAxesMaturity(
    await maturityByAxisForFormAndVersion(
      organizationId,
      formId,
      processingVersion,
    ),
  );

  const { data: sectionRows, error: sErr } = await client
    .from("fami_results")
    .select("scope_id,percentage,maturity_level,points_obtained,points_possible")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("processing_version", processingVersion)
    .eq("scope_type", "section");
  if (sErr) throw sErr;

  const sectionIds = (sectionRows ?? [])
    .map((r) => r.scope_id as string | null)
    .filter((id): id is string => Boolean(id));

  const { sectionNames: nameBySectionId } =
    sectionIds.length > 0
      ? await fetchScopeDisplayNames(client, sectionIds, [])
      : { sectionNames: new Map<string, string>() };

  const sections: FamiSectionSnapshot[] = (sectionRows ?? []).map((row) => {
    const sid = row.scope_id as string;
    return {
      sectionId: sid,
      sectionName: nameBySectionId.get(sid) ?? sid.slice(0, 8),
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
      pointsObtained: Number(row.points_obtained ?? 0),
      pointsPossible: Number(row.points_possible ?? 0),
    };
  });

  sections.sort((a, b) => a.sectionName.localeCompare(b.sectionName, "pt-BR"));

  return {
    formId,
    organizationId,
    processingVersion,
    global,
    axes,
    sections,
  };
}

export async function getFamiSnapshotLatest(
  formId: string,
  organizationId: string,
): Promise<FamiSnapshot | null> {
  const ver = await getLatestFamiVersionForFormOrg(formId, organizationId);
  if (!ver) return null;
  return buildFamiSnapshot(formId, organizationId, ver.processingVersion);
}

/**
 * Maior processing_version entre snapshots globais com created_at naquele ano civil (BRT).
 */
export async function resolveYearEndFamiVersion(
  formId: string,
  organizationId: string,
  year: number,
): Promise<number | null> {
  const { fromInclusive, toInclusive } = brtYearUtcBounds(year);
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("processing_version, created_at")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .gte("created_at", fromInclusive)
    .lte("created_at", toInclusive)
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data == null) return null;
  return Number(data.processing_version ?? 0);
}

export async function buildFamiSnapshotForYear(
  formId: string,
  organizationId: string,
  year: number,
): Promise<FamiSnapshot | null> {
  const v = await resolveYearEndFamiVersion(formId, organizationId, year);
  if (v == null) return null;
  return buildFamiSnapshot(formId, organizationId, v);
}

/** Anos (BRT) com ao menos um processamento global neste formulário/org. Mais recentes primeiro. */
export async function getAvailableFamiYears(
  formId: string,
  organizationId: string,
): Promise<number[]> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("created_at")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "global");
  if (error) throw error;
  const years = new Set<number>();
  for (const row of data ?? []) {
    const iso = String(row.created_at ?? "");
    if (!iso) continue;
    years.add(getCalendarYearBrt(iso));
  }
  return Array.from(years).sort((a, b) => b - a);
}

export async function getFamiEvolutionByYear(
  formId: string,
  organizationId: string,
): Promise<FamiEvolutionYearPoint[]> {
  const client = getClient();

  const { data: globalRows, error } = await client
    .from("fami_results")
    .select("processing_version,created_at,percentage,maturity_level")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const lite = (globalRows ?? [])
    .map((row) => ({
      processingVersion: Number(row.processing_version ?? 0),
      createdAt: String(row.created_at ?? ""),
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
    }))
    .filter((r) => r.createdAt.length > 0);

  const picked = pickBestGlobalPerBrtYear(lite);
  if (picked.length === 0) return [];

  const versions = [...new Set(picked.map((p) => p.processingVersion))];

  const { data: axisFami, error: axisErr } = await client
    .from("fami_results")
    .select("processing_version,scope_id,percentage")
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .eq("scope_type", "axis")
    .in("processing_version", versions);
  if (axisErr) throw axisErr;

  const evolutionAxisIds = [
    ...new Set(
      (axisFami ?? [])
        .map((row) => row.scope_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { axisNames: evolutionAxisNames } =
    evolutionAxisIds.length > 0
      ? await fetchScopeDisplayNames(client, [], evolutionAxisIds)
      : { axisNames: new Map<string, string>() };

  const axisPercentagesByVersion = new Map<number, Record<string, number>>();
  for (const row of axisFami ?? []) {
    const v = Number(row.processing_version ?? 0);
    const aid = row.scope_id as string | null;
    if (!aid) continue;
    const name = evolutionAxisNames.get(aid) ?? aid.slice(0, 8);
    const map = axisPercentagesByVersion.get(v) ?? {};
    map[name] = Number(row.percentage ?? 0);
    axisPercentagesByVersion.set(v, map);
  }

  return picked.map((b) => ({
    year: getCalendarYearBrt(b.createdAt),
    processingVersion: b.processingVersion,
    createdAt: b.createdAt,
    globalPercentage: b.percentage,
    globalMaturityLevel: b.maturityLevel,
    axisPercentages: axisPercentagesByVersion.get(b.processingVersion) ?? {},
  }));
}

/**
 * Par (formId, processingVersion) do “fechamento” BRT do ano, usando o mesmo formId
 * do ultimo contexto atual da organizacao (alinhado ao painel dashboard).
 */
export async function resolveYearEndFamiContextForOrganization(
  organizationId: string,
  year: number,
): Promise<{ formId: string; processingVersion: number } | null> {
  const baseline = await resolveLatestFamiContextForOrganization(organizationId);
  if (!baseline) return null;
  const v = await resolveYearEndFamiVersion(baseline.formId, organizationId, year);
  if (v == null) return null;
  return { formId: baseline.formId, processingVersion: v };
}

/**
 * Para a visao "Geral" (todas as organizacoes), pegamos o ultimo created_at
 * entre todos os snapshots globais do par (form_id) e devolvemos a data como
 * marca temporal agregada. processingVersion fica como 0 (sentinela de agregado).
 */
export async function getLatestFamiVersionForFormGlobal(
  formId: string,
): Promise<{ processingVersion: number; createdAt: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("created_at")
    .eq("form_id", formId)
    .eq("scope_type", "global")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    processingVersion: 0,
    createdAt: String(data.created_at ?? ""),
  };
}

/**
 * Snapshot agregado para a visao "Geral" (todas as organizacoes) de um formulario.
 *
 * Estrategia:
 * 1. Para cada organizacao com FAMI neste formulario, pegamos sua ultima
 *    processing_version (par mais recente);
 * 2. Computamos percentuais agregando por media simples (axis_id / section_id /
 *    global); pontos sao somados para refletir totais institucionais;
 * 3. maturity_level e arredondado a partir da media.
 *
 * Limitacao conhecida: evolucao por versao nao tem semantica cross-org porque
 * as versoes sao independentes em cada organizacao -- evolucao retorna vazio.
 */
export async function getFamiSnapshotGlobal(
  formId: string,
): Promise<FamiSnapshot | null> {
  const client = getClient();

  const { data: globalRows, error: gErr } = await client
    .from("fami_results")
    .select(
      "organization_id,processing_version,percentage,maturity_level,points_obtained,points_possible,created_at",
    )
    .eq("form_id", formId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false });
  if (gErr) throw gErr;

  type GlobalLatest = {
    version: number;
    percentage: number;
    maturityLevel: number;
    pointsObtained: number;
    pointsPossible: number;
    createdAt: string;
  };

  const latestByOrg = new Map<string, GlobalLatest>();
  for (const row of globalRows ?? []) {
    const orgId = row.organization_id as string | null;
    if (!orgId || latestByOrg.has(orgId)) continue;
    latestByOrg.set(orgId, {
      version: Number(row.processing_version ?? 0),
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
      pointsObtained: Number(row.points_obtained ?? 0),
      pointsPossible: Number(row.points_possible ?? 0),
      createdAt: String(row.created_at ?? ""),
    });
  }

  if (latestByOrg.size === 0) return null;

  let sumPct = 0;
  let sumLvl = 0;
  let sumObt = 0;
  let sumPos = 0;
  let latestCreatedAt = "";
  for (const v of latestByOrg.values()) {
    sumPct += v.percentage;
    sumLvl += v.maturityLevel;
    sumObt += v.pointsObtained;
    sumPos += v.pointsPossible;
    if (v.createdAt > latestCreatedAt) latestCreatedAt = v.createdAt;
  }
  const orgCount = latestByOrg.size;
  const avgPercentage = Number((sumPct / orgCount).toFixed(2));
  const global: FamiGlobalSnapshot = {
    percentage: avgPercentage,
    maturityLevel: levelFromPercentage(avgPercentage),
    pointsObtained: Number(sumObt.toFixed(2)),
    pointsPossible: Number(sumPos.toFixed(2)),
    createdAt: latestCreatedAt,
  };

  const isMatchedPair = (orgId: string | null, version: number): boolean => {
    if (!orgId) return false;
    const latest = latestByOrg.get(orgId);
    return latest ? latest.version === version : false;
  };

  const { data: axisRows, error: aErr } = await client
    .from("fami_results")
    .select("organization_id,processing_version,scope_id,percentage,maturity_level")
    .eq("form_id", formId)
    .eq("scope_type", "axis");
  if (aErr) throw aErr;

  const axisAcc = new Map<string, { pct: number; lvl: number; n: number }>();
  for (const row of axisRows ?? []) {
    const orgId = row.organization_id as string | null;
    const version = Number(row.processing_version ?? 0);
    if (!isMatchedPair(orgId, version)) continue;
    const axisId = row.scope_id as string | null;
    if (!axisId) continue;
    const cur = axisAcc.get(axisId) ?? { pct: 0, lvl: 0, n: 0 };
    cur.pct += Number(row.percentage ?? 0);
    cur.lvl += Number(row.maturity_level ?? 0);
    cur.n += 1;
    axisAcc.set(axisId, cur);
  }

  const globalAxisIds = Array.from(axisAcc.keys());
  const { axisNames: globalAxisNames } =
    globalAxisIds.length > 0
      ? await fetchScopeDisplayNames(client, [], globalAxisIds)
      : { axisNames: new Map<string, string>() };

  const axes: AxisMaturity[] = sortAxesMaturity(
    globalAxisIds.map((axisId) => {
      const cur = axisAcc.get(axisId)!;
      const pct = Number((cur.pct / cur.n).toFixed(2));
      return {
        axisId,
        axisName: globalAxisNames.get(axisId) ?? axisId.slice(0, 8),
        percentage: pct,
        maturityLevel: levelFromPercentage(pct),
      };
    }),
  );

  const { data: sectionRows, error: sErr } = await client
    .from("fami_results")
    .select(
      "organization_id,processing_version,scope_id,percentage,maturity_level,points_obtained,points_possible",
    )
    .eq("form_id", formId)
    .eq("scope_type", "section");
  if (sErr) throw sErr;

  type SectionAcc = {
    pct: number;
    lvl: number;
    obt: number;
    pos: number;
    n: number;
  };
  const sectionAcc = new Map<string, SectionAcc>();
  for (const row of sectionRows ?? []) {
    const orgId = row.organization_id as string | null;
    const version = Number(row.processing_version ?? 0);
    if (!isMatchedPair(orgId, version)) continue;
    const sectionId = row.scope_id as string | null;
    if (!sectionId) continue;
    const cur = sectionAcc.get(sectionId) ?? {
      pct: 0,
      lvl: 0,
      obt: 0,
      pos: 0,
      n: 0,
    };
    cur.pct += Number(row.percentage ?? 0);
    cur.lvl += Number(row.maturity_level ?? 0);
    cur.obt += Number(row.points_obtained ?? 0);
    cur.pos += Number(row.points_possible ?? 0);
    cur.n += 1;
    sectionAcc.set(sectionId, cur);
  }

  const sectionIds = Array.from(sectionAcc.keys());
  const { sectionNames: nameBySectionId } =
    sectionIds.length > 0
      ? await fetchScopeDisplayNames(client, sectionIds, [])
      : { sectionNames: new Map<string, string>() };

  const sections: FamiSectionSnapshot[] = sectionIds.map((sid) => {
    const cur = sectionAcc.get(sid)!;
    const pct = Number((cur.pct / cur.n).toFixed(2));
    return {
      sectionId: sid,
      sectionName: nameBySectionId.get(sid) ?? sid.slice(0, 8),
      percentage: pct,
      maturityLevel: levelFromPercentage(pct),
      pointsObtained: Number(cur.obt.toFixed(2)),
      pointsPossible: Number(cur.pos.toFixed(2)),
    };
  });
  sections.sort((a, b) => a.sectionName.localeCompare(b.sectionName, "pt-BR"));

  return {
    formId,
    organizationId: "",
    processingVersion: 0,
    global,
    axes,
    sections,
  };
}

export async function getFamiEvolution(
  formId: string,
  organizationId: string,
): Promise<FamiEvolutionPoint[]> {
  const client = getClient();
  const { data: rows, error } = await client
    .from("fami_results")
    .select(
      "processing_version,created_at,scope_type,scope_id,percentage,maturity_level",
    )
    .eq("form_id", formId)
    .eq("organization_id", organizationId)
    .in("scope_type", ["global", "axis"])
    .order("processing_version", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const evolutionAxisScopeIds = [
    ...new Set(
      (rows ?? [])
        .filter((row) => row.scope_type === "axis")
        .map((row) => row.scope_id as string | null)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { axisNames: liveEvolutionAxisNames } =
    evolutionAxisScopeIds.length > 0
      ? await fetchScopeDisplayNames(client, [], evolutionAxisScopeIds)
      : { axisNames: new Map<string, string>() };

  type Acc = {
    createdAt: string;
    globalPercentage: number | null;
    globalMaturityLevel: number | null;
    axisPercentages: Record<string, number>;
  };

  const byVersion = new Map<number, Acc>();

  for (const row of rows ?? []) {
    const v = Number(row.processing_version ?? 0);
    const st = row.scope_type as string;
    if (!byVersion.has(v)) {
      byVersion.set(v, {
        createdAt: String(row.created_at ?? ""),
        globalPercentage: null,
        globalMaturityLevel: null,
        axisPercentages: {},
      });
    }
    const acc = byVersion.get(v)!;
    if (String(row.created_at ?? "") > acc.createdAt) {
      acc.createdAt = String(row.created_at ?? "");
    }
    if (st === "global") {
      acc.globalPercentage = Number(row.percentage ?? 0);
      acc.globalMaturityLevel = Number(row.maturity_level ?? 0);
    } else if (st === "axis") {
      const aid = row.scope_id as string | null;
      if (aid) {
        const name = liveEvolutionAxisNames.get(aid) ?? aid.slice(0, 8);
        acc.axisPercentages[name] = Number(row.percentage ?? 0);
      }
    }
  }

  return Array.from(byVersion.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([processingVersion, acc]) => ({
      processingVersion,
      createdAt: acc.createdAt,
      globalPercentage: acc.globalPercentage,
      globalMaturityLevel: acc.globalMaturityLevel,
      axisPercentages: acc.axisPercentages,
    }));
}
