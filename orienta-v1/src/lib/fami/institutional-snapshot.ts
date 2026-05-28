import "server-only";

import { pickBestGlobalPerBrtYear } from "@/lib/fami/fami-evolution-year-pick";
import { getCalendarYearBrt } from "@/lib/fami/fami-year";
import { fetchScopeDisplayNames } from "@/lib/workbench/resolve-question-structure";
import { sortAxesMaturity, levelFromPercentage } from "@/lib/fami/fami-axis-display";
import type {
  FamiEvolutionYearPoint,
  FamiGlobalSnapshot,
  FamiSectionSnapshot,
  FamiSnapshot,
} from "@/lib/fami/queries";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { AxisMaturity } from "@/lib/fami/types";
import { FAMI_ALL_FORMS, type InstitutionalFormScore } from "@/lib/fami/constants";
import {
  buildFamiSnapshot,
  buildFamiSnapshotForYear,
  resolveYearEndFamiVersion,
} from "@/lib/fami/queries";

export { FAMI_ALL_FORMS } from "@/lib/fami/constants";
export type { InstitutionalFormScore } from "@/lib/fami/constants";

type Client = ReturnType<typeof createSupabaseServiceRoleClient>;

type FormLatestGlobal = {
  formId: string;
  version: number;
  percentage: number;
  maturityLevel: number;
  pointsObtained: number;
  pointsPossible: number;
  createdAt: string;
};

function getClient(): Client {
  return createSupabaseServiceRoleClient();
}

function pickLatestGlobalPerForm(
  rows: Array<{
    form_id: string | null;
    processing_version: number | null;
    percentage: number | null;
    maturity_level: number | null;
    points_obtained: number | null;
    points_possible: number | null;
    created_at: string | null;
  }>,
): Map<string, FormLatestGlobal> {
  const latestByForm = new Map<string, FormLatestGlobal>();
  for (const row of rows) {
    const formId = row.form_id;
    if (!formId || latestByForm.has(formId)) continue;
    latestByForm.set(formId, {
      formId,
      version: Number(row.processing_version ?? 0),
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
      pointsObtained: Number(row.points_obtained ?? 0),
      pointsPossible: Number(row.points_possible ?? 0),
      createdAt: String(row.created_at ?? ""),
    });
  }
  return latestByForm;
}

function averageGlobalFromForms(latestByForm: Map<string, FormLatestGlobal>): FamiGlobalSnapshot | null {
  if (latestByForm.size === 0) return null;
  let sumPct = 0;
  let sumObt = 0;
  let sumPos = 0;
  let latestCreatedAt = "";
  for (const v of latestByForm.values()) {
    sumPct += v.percentage;
    sumObt += v.pointsObtained;
    sumPos += v.pointsPossible;
    if (v.createdAt > latestCreatedAt) latestCreatedAt = v.createdAt;
  }
  const n = latestByForm.size;
  const pct = Number((sumPct / n).toFixed(2));
  return {
    percentage: pct,
    maturityLevel: levelFromPercentage(pct),
    pointsObtained: Number(sumObt.toFixed(2)),
    pointsPossible: Number(sumPos.toFixed(2)),
    createdAt: latestCreatedAt,
  };
}

async function aggregateAxesForForms(
  client: Client,
  organizationId: string,
  latestByForm: Map<string, FormLatestGlobal>,
): Promise<AxisMaturity[]> {
  const isMatchedPair = (formId: string | null, version: number): boolean => {
    if (!formId) return false;
    const latest = latestByForm.get(formId);
    return latest ? latest.version === version : false;
  };

  const { data: axisRows, error } = await client
    .from("fami_results")
    .select("form_id,processing_version,scope_id,percentage,maturity_level")
    .eq("organization_id", organizationId)
    .eq("scope_type", "axis");
  if (error) throw error;

  const axisAcc = new Map<string, { pct: number; lvl: number; n: number }>();
  const axisIds = new Set<string>();
  for (const row of axisRows ?? []) {
    const formId = row.form_id as string | null;
    const version = Number(row.processing_version ?? 0);
    if (!isMatchedPair(formId, version)) continue;
    const axisId = row.scope_id as string | null;
    if (!axisId) continue;
    axisIds.add(axisId);
    const cur = axisAcc.get(axisId) ?? { pct: 0, lvl: 0, n: 0 };
    cur.pct += Number(row.percentage ?? 0);
    cur.lvl += Number(row.maturity_level ?? 0);
    cur.n += 1;
    axisAcc.set(axisId, cur);
  }

  const { axisNames } =
    axisIds.size > 0
      ? await fetchScopeDisplayNames(client, [], Array.from(axisIds))
      : { axisNames: new Map<string, string>() };

  const byName = new Map<string, { pct: number; lvl: number; n: number }>();
  for (const [axisId, cur] of axisAcc) {
    const name = axisNames.get(axisId) ?? axisId.slice(0, 8);
    const agg = byName.get(name) ?? { pct: 0, lvl: 0, n: 0 };
    agg.pct += cur.pct;
    agg.lvl += cur.lvl;
    agg.n += cur.n;
    byName.set(name, agg);
  }

  const merged: AxisMaturity[] = Array.from(byName.entries()).map(([axisName, cur]) => {
    const pct = Number((cur.pct / cur.n).toFixed(2));
    return {
      axisId: axisName,
      axisName,
      percentage: pct,
      maturityLevel: levelFromPercentage(pct),
    };
  });
  return sortAxesMaturity(merged);
}

async function aggregateSectionsForForms(
  client: Client,
  organizationId: string,
  latestByForm: Map<string, FormLatestGlobal>,
): Promise<FamiSectionSnapshot[]> {
  const isMatchedPair = (formId: string | null, version: number): boolean => {
    if (!formId) return false;
    const latest = latestByForm.get(formId);
    return latest ? latest.version === version : false;
  };

  const { data: sectionRows, error } = await client
    .from("fami_results")
    .select(
      "form_id,processing_version,scope_id,percentage,maturity_level,points_obtained,points_possible",
    )
    .eq("organization_id", organizationId)
    .eq("scope_type", "section");
  if (error) throw error;

  const sectionAcc = new Map<
    string,
    { pct: number; lvl: number; obt: number; pos: number; n: number }
  >();
  const sectionIds = new Set<string>();
  for (const row of sectionRows ?? []) {
    const formId = row.form_id as string | null;
    const version = Number(row.processing_version ?? 0);
    if (!isMatchedPair(formId, version)) continue;
    const sectionId = row.scope_id as string | null;
    if (!sectionId) continue;
    sectionIds.add(sectionId);
    const cur = sectionAcc.get(sectionId) ?? { pct: 0, lvl: 0, obt: 0, pos: 0, n: 0 };
    cur.pct += Number(row.percentage ?? 0);
    cur.lvl += Number(row.maturity_level ?? 0);
    cur.obt += Number(row.points_obtained ?? 0);
    cur.pos += Number(row.points_possible ?? 0);
    cur.n += 1;
    sectionAcc.set(sectionId, cur);
  }

  const { sectionNames } =
    sectionIds.size > 0
      ? await fetchScopeDisplayNames(client, Array.from(sectionIds), [])
      : { sectionNames: new Map<string, string>() };

  const byName = new Map<
    string,
    { pct: number; lvl: number; obt: number; pos: number; n: number }
  >();
  for (const [sectionId, cur] of sectionAcc) {
    const name = sectionNames.get(sectionId) ?? sectionId.slice(0, 8);
    const agg = byName.get(name) ?? { pct: 0, lvl: 0, obt: 0, pos: 0, n: 0 };
    agg.pct += cur.pct;
    agg.lvl += cur.lvl;
    agg.obt += cur.obt;
    agg.pos += cur.pos;
    agg.n += cur.n;
    byName.set(name, agg);
  }

  return Array.from(byName.entries())
    .map(([sectionName, cur]) => {
      const pct = Number((cur.pct / cur.n).toFixed(2));
      return {
        sectionId: sectionName,
        sectionName,
        percentage: pct,
        maturityLevel: levelFromPercentage(pct),
        pointsObtained: Number(cur.obt.toFixed(2)),
        pointsPossible: Number(cur.pos.toFixed(2)),
      };
    })
    .sort((a, b) => a.sectionName.localeCompare(b.sectionName, "pt-BR"));
}

/**
 * Visão institucional: média do último FAMI global de cada formulário da organização.
 * Eixos/seções agregados por nome (média simples entre formulários).
 */
export async function getFamiSnapshotInstitutional(
  organizationId: string,
): Promise<FamiSnapshot | null> {
  const client = getClient();
  const { data: globalRows, error: gErr } = await client
    .from("fami_results")
    .select(
      "form_id,processing_version,percentage,maturity_level,points_obtained,points_possible,created_at",
    )
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false });
  if (gErr) throw gErr;

  const latestByForm = pickLatestGlobalPerForm(globalRows ?? []);
  const global = averageGlobalFromForms(latestByForm);
  if (!global) return null;

  const [axes, sections] = await Promise.all([
    aggregateAxesForForms(client, organizationId, latestByForm),
    aggregateSectionsForForms(client, organizationId, latestByForm),
  ]);

  return {
    formId: FAMI_ALL_FORMS,
    organizationId,
    processingVersion: 0,
    global,
    axes,
    sections,
  };
}

export async function getInstitutionalFormScores(
  organizationId: string,
): Promise<InstitutionalFormScore[]> {
  const client = getClient();
  const { data: globalRows, error } = await client
    .from("fami_results")
    .select(
      "form_id,processing_version,percentage,maturity_level,points_obtained,points_possible,created_at",
    )
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;

  const latestByForm = pickLatestGlobalPerForm(globalRows ?? []);
  return Array.from(latestByForm.values())
    .map((v) => ({
      formId: v.formId,
      percentage: v.percentage,
      maturityLevel: v.maturityLevel,
      pointsObtained: v.pointsObtained,
      pointsPossible: v.pointsPossible,
      createdAt: v.createdAt,
      processingVersion: v.version,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export async function getLatestFamiMetaInstitutional(
  organizationId: string,
): Promise<{ processingVersion: number; createdAt: string } | null> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("created_at")
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { processingVersion: 0, createdAt: String(data.created_at ?? "") };
}

export async function getAvailableFamiYearsInstitutional(
  organizationId: string,
): Promise<number[]> {
  const client = getClient();
  const { data, error } = await client
    .from("fami_results")
    .select("created_at")
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

export async function buildFamiSnapshotInstitutionalForYear(
  organizationId: string,
  year: number,
): Promise<FamiSnapshot | null> {
  const scores = await getInstitutionalFormScores(organizationId);
  if (scores.length === 0) return null;

  const snapshots: FamiSnapshot[] = [];
  for (const { formId } of scores) {
    const v = await resolveYearEndFamiVersion(formId, organizationId, year);
    if (v == null) continue;
    snapshots.push(await buildFamiSnapshot(formId, organizationId, v));
  }
  if (snapshots.length === 0) return null;

  let sumPct = 0;
  let sumObt = 0;
  let sumPos = 0;
  let latestCreatedAt = "";
  for (const s of snapshots) {
    if (!s.global) continue;
    sumPct += s.global.percentage;
    sumObt += s.global.pointsObtained;
    sumPos += s.global.pointsPossible;
    if (s.global.createdAt > latestCreatedAt) latestCreatedAt = s.global.createdAt;
  }
  const n = snapshots.filter((s) => s.global).length;
  if (n === 0) return null;

  const globalPct = Number((sumPct / n).toFixed(2));
  const global: FamiGlobalSnapshot = {
    percentage: globalPct,
    maturityLevel: levelFromPercentage(globalPct),
    pointsObtained: Number(sumObt.toFixed(2)),
    pointsPossible: Number(sumPos.toFixed(2)),
    createdAt: latestCreatedAt,
  };

  const axisByName = new Map<string, { pct: number; n: number }>();
  for (const s of snapshots) {
    for (const a of s.axes) {
      const cur = axisByName.get(a.axisName) ?? { pct: 0, n: 0 };
      cur.pct += a.percentage;
      cur.n += 1;
      axisByName.set(a.axisName, cur);
    }
  }

  const axes: AxisMaturity[] = sortAxesMaturity(
    Array.from(axisByName.entries()).map(([axisName, cur]) => {
      const pct = Number((cur.pct / cur.n).toFixed(2));
      return {
        axisId: axisName,
        axisName,
        percentage: pct,
        maturityLevel: levelFromPercentage(pct),
      };
    }),
  );

  return {
    formId: FAMI_ALL_FORMS,
    organizationId,
    processingVersion: 0,
    global,
    axes,
    sections: [],
  };
}

export async function getFamiEvolutionInstitutionalByYear(
  organizationId: string,
): Promise<FamiEvolutionYearPoint[]> {
  const client = getClient();
  const { data: globalRows, error } = await client
    .from("fami_results")
    .select("form_id,processing_version,created_at,percentage,maturity_level")
    .eq("organization_id", organizationId)
    .eq("scope_type", "global")
    .order("processing_version", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const byForm = new Map<
    string,
    Array<{
      processingVersion: number;
      createdAt: string;
      percentage: number;
      maturityLevel: number;
    }>
  >();
  for (const row of globalRows ?? []) {
    const formId = row.form_id as string | null;
    if (!formId) continue;
    const list = byForm.get(formId) ?? [];
    list.push({
      processingVersion: Number(row.processing_version ?? 0),
      createdAt: String(row.created_at ?? ""),
      percentage: Number(row.percentage ?? 0),
      maturityLevel: Number(row.maturity_level ?? 0),
    });
    byForm.set(formId, list);
  }

  const yearAgg = new Map<
    number,
    { sumPct: number; sumLvl: number; count: number; latestCreatedAt: string; version: number }
  >();

  for (const list of byForm.values()) {
    const picked = pickBestGlobalPerBrtYear(
      list.filter((r) => r.createdAt.length > 0),
    );
    for (const p of picked) {
      const year = getCalendarYearBrt(p.createdAt);
      const cur = yearAgg.get(year) ?? {
        sumPct: 0,
        sumLvl: 0,
        count: 0,
        latestCreatedAt: "",
        version: 0,
      };
      cur.sumPct += p.percentage;
      cur.sumLvl += p.maturityLevel;
      cur.count += 1;
      if (p.createdAt > cur.latestCreatedAt) {
        cur.latestCreatedAt = p.createdAt;
        cur.version = p.processingVersion;
      }
      yearAgg.set(year, cur);
    }
  }

  return Array.from(yearAgg.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([year, cur]) => ({
      year,
      processingVersion: cur.version,
      createdAt: cur.latestCreatedAt,
      globalPercentage: Number((cur.sumPct / cur.count).toFixed(2)),
      globalMaturityLevel: Math.round(cur.sumLvl / cur.count),
      axisPercentages: {},
    }));
}

/** Snapshot institucional ou de um formulário conforme ano (BRT). */
export async function resolveInstitutionalOrFormSnapshotForYear(
  organizationId: string,
  formId: string,
  year: number,
): Promise<FamiSnapshot | null> {
  if (formId === FAMI_ALL_FORMS) {
    return buildFamiSnapshotInstitutionalForYear(organizationId, year);
  }
  return buildFamiSnapshotForYear(formId, organizationId, year);
}
