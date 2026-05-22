import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { logInfo } from "@/lib/observability/logger";
import type { LibraryItemType } from "./types";

export type EffectivenessRange = "green" | "amber" | "red";

export type EffectivenessRow = {
  id: string;
  itemType: LibraryItemType;
  itemId: string;
  periodStart: string;
  periodEnd: string;
  totalTriggers: number;
  accepted: number;
  rejected: number;
  planConversions: number;
  averageConfidence: number | null;
  capturedAt: string;
  range: EffectivenessRange;
  acceptanceRate: number;
};

type Row = {
  id: string;
  item_type: LibraryItemType;
  item_id: string;
  period_start: string;
  period_end: string;
  total_triggers: number | string;
  accepted: number | string;
  rejected: number | string;
  plan_conversions: number | string;
  average_confidence: number | string | null;
  captured_at: string;
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return typeof value === "string" ? Number.parseFloat(value) : Number(value);
}

const EFFECTIVENESS_THRESHOLDS = {
  greenAcceptance: 70,
  greenConfidence: 80,
  amberAcceptance: 50,
  amberConfidence: 50,
} as const;

export function classifyEffectiveness(
  acceptanceRatePercent: number,
  averageConfidencePercent: number | null,
): EffectivenessRange {
  const confidence = averageConfidencePercent ?? acceptanceRatePercent;
  if (
    acceptanceRatePercent >= EFFECTIVENESS_THRESHOLDS.greenAcceptance &&
    confidence >= EFFECTIVENESS_THRESHOLDS.greenConfidence
  ) {
    return "green";
  }
  if (
    acceptanceRatePercent >= EFFECTIVENESS_THRESHOLDS.amberAcceptance &&
    confidence >= EFFECTIVENESS_THRESHOLDS.amberConfidence
  ) {
    return "amber";
  }
  return "red";
}

function mapRow(row: Row): EffectivenessRow {
  const total = toNumber(row.total_triggers);
  const accepted = toNumber(row.accepted);
  const avgConfidence =
    row.average_confidence === null || row.average_confidence === undefined
      ? null
      : toNumber(row.average_confidence);
  const acceptanceRate = total === 0 ? 0 : accepted / total;
  const acceptanceRatePercent = Number((acceptanceRate * 100).toFixed(2));
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    totalTriggers: total,
    accepted,
    rejected: toNumber(row.rejected),
    planConversions: toNumber(row.plan_conversions),
    averageConfidence: avgConfidence,
    capturedAt: row.captured_at,
    acceptanceRate: acceptanceRatePercent,
    range: classifyEffectiveness(acceptanceRatePercent, avgConfidence),
  };
}

export class EffectivenessService {
  private supabase: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async list(filter: {
    itemType?: LibraryItemType;
    periodStart?: string;
    periodEnd?: string;
  } = {}): Promise<EffectivenessRow[]> {
    let query = this.supabase
      .from("library_effectiveness_snapshots")
      .select("*")
      .order("period_end", { ascending: false });
    if (filter.itemType) query = query.eq("item_type", filter.itemType);
    if (filter.periodStart) query = query.gte("period_start", filter.periodStart);
    if (filter.periodEnd) query = query.lte("period_end", filter.periodEnd);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as Row));
  }

  async recordSnapshot(input: {
    itemType: LibraryItemType;
    itemId: string;
    periodStart: string;
    periodEnd: string;
    totalTriggers: number;
    accepted: number;
    rejected: number;
    planConversions: number;
    averageConfidence: number | null;
    payload?: Record<string, unknown>;
  }): Promise<EffectivenessRow> {
    const { data, error } = await this.supabase
      .from("library_effectiveness_snapshots")
      .insert({
        item_type: input.itemType,
        item_id: input.itemId,
        period_start: input.periodStart,
        period_end: input.periodEnd,
        total_triggers: input.totalTriggers,
        accepted: input.accepted,
        rejected: input.rejected,
        plan_conversions: input.planConversions,
        average_confidence: input.averageConfidence,
        payload: input.payload ?? {},
      })
      .select("*")
      .single();
    if (error) throw error;
    logInfo("library.effectiveness.snapshot_recorded", {
      itemType: input.itemType,
      itemId: input.itemId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
    });
    return mapRow(data as Row);
  }
}

function effectivenessLabelKey(itemType: LibraryItemType, itemId: string): string {
  return `${itemType}:${itemId}`;
}

/** Resolve nomes/códigos dos itens do catálogo da biblioteca para exibição nas linhas de efetividade. */
export async function resolveLibraryItemLabelsForRows(
  rows: EffectivenessRow[],
  client?: SupabaseClient,
): Promise<Map<string, string>> {
  const supabase = client ?? createSupabaseServiceRoleClient();
  const out = new Map<string, string>();

  const grouped = new Map<LibraryItemType, Set<string>>();
  for (const row of rows) {
    if (!grouped.has(row.itemType)) grouped.set(row.itemType, new Set());
    grouped.get(row.itemType)!.add(row.itemId);
  }

  for (const [itemType, ids] of grouped) {
    const idList = [...ids];
    if (idList.length === 0) continue;

    if (itemType === "axis") {
      const { data } = await supabase.from("library_axes").select("id,name,code").in("id", idList);
      for (const r of data ?? []) {
        const row = r as { id: string; name: string; code: string };
        const label = [row.code, row.name].filter(Boolean).join(" · ");
        out.set(effectivenessLabelKey("axis", row.id), label || row.name);
      }
    } else if (itemType === "section") {
      const { data } = await supabase.from("library_sections").select("id,name,code").in("id", idList);
      for (const r of data ?? []) {
        const row = r as { id: string; name: string; code: string };
        const label = [row.code, row.name].filter(Boolean).join(" · ");
        out.set(effectivenessLabelKey("section", row.id), label || row.name);
      }
    } else if (itemType === "metric") {
      const { data } = await supabase.from("library_metrics").select("id,name,code").in("id", idList);
      for (const r of data ?? []) {
        const row = r as { id: string; name: string; code: string };
        const label = [row.code, row.name].filter(Boolean).join(" · ");
        out.set(effectivenessLabelKey("metric", row.id), label || row.name);
      }
    } else if (itemType === "recommendation") {
      const { data } = await supabase
        .from("library_recommendations")
        .select("id,title,code")
        .in("id", idList);
      for (const r of data ?? []) {
        const row = r as { id: string; title: string; code: string };
        const label = [row.code, row.title].filter(Boolean).join(" · ");
        out.set(effectivenessLabelKey("recommendation", row.id), label || row.title);
      }
    } else if (itemType === "action") {
      const { data } = await supabase.from("library_actions").select("id,title,code").in("id", idList);
      for (const r of data ?? []) {
        const row = r as { id: string; title: string; code: string };
        const label = [row.code, row.title].filter(Boolean).join(" · ");
        out.set(effectivenessLabelKey("action", row.id), label || row.title);
      }
    }
  }

  return out;
}
