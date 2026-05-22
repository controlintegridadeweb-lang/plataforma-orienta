import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type {
  LibraryAxis,
  LibraryCatalogSnapshot,
  LibraryCommonFields,
  LibraryItemStatus,
  LibraryItemVersion,
  LibraryItemType,
  LibraryMetric,
  LibraryModelAction,
  LibraryParameterVariable,
  LibraryRecommendationType,
  LibraryMetricAnswerType,
  LibraryMetricInterpretation,
  LibraryRecommendationBase,
  LibrarySection,
  LibrarySnapshot,
} from "./types";
import type {
  LibraryActionInput,
  LibraryAxisInput,
  LibraryMetricInput,
  LibraryRecommendationInput,
  LibrarySectionInput,
} from "./schemas";

type Client = SupabaseClient;

type CommonRow = {
  status: LibraryItemStatus | null;
  version_major: number | null;
  version_minor: number | null;
  version_patch: number | null;
  vigente_de: string | null;
  vigente_ate: string | null;
  tags: string[] | null;
  created_by: string | null;
  updated_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  deprecated_by: string | null;
  deprecated_at: string | null;
};

type AxisRow = CommonRow & {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
};

type SectionRow = CommonRow & {
  id: string;
  axis_id: string;
  code: string;
  name: string;
  description: string | null;
  ordem: number;
  created_at: string;
  updated_at: string;
  library_axes: { code: string } | { code: string }[] | null;
};

type MetricRow = CommonRow & {
  id: string;
  code: string;
  name: string;
  description: string | null;
  answer_type: LibraryMetricAnswerType;
  interpretation: LibraryMetricInterpretation;
  trigger_summary: string | null;
  created_at: string;
  updated_at: string;
};

type RecommendationRow = CommonRow & {
  id: string;
  code: string;
  title: string;
  description: string | null;
  tipo: LibraryRecommendationType | null;
  texto_base_fixo: string | null;
  texto_base_parametrizavel: string | null;
  variaveis_parametro: unknown;
  fundamento_tecnico: string | null;
  escopo_aplicacao: string | null;
  created_at: string;
  updated_at: string;
};

type ActionRow = CommonRow & {
  id: string;
  code: string;
  title: string;
  description: string | null;
  suggested_deadline_days: number;
  suggested_responsible_area: string | null;
  fundamento_tecnico: string | null;
  criterio_conclusao: string | null;
  created_at: string;
  updated_at: string;
};

function mapCommon(row: CommonRow): LibraryCommonFields {
  const versionMajor = row.version_major ?? 0;
  const versionMinor = row.version_minor ?? 1;
  const versionPatch = row.version_patch ?? 0;
  return {
    status: row.status ?? "draft",
    versionMajor,
    versionMinor,
    versionPatch,
    version: `${versionMajor}.${versionMinor}.${versionPatch}`,
    vigenteDe: row.vigente_de,
    vigenteAte: row.vigente_ate,
    tags: row.tags ?? [],
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    approvedBy: row.approved_by,
    approvedAt: row.approved_at,
    deprecatedBy: row.deprecated_by,
    deprecatedAt: row.deprecated_at,
  };
}

function commonInsertPayload(
  input: { status?: string | undefined; tags?: string[] | undefined },
  actorUserId?: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.status) payload.status = input.status;
  if (input.tags) payload.tags = input.tags;
  if (actorUserId) {
    payload.created_by = actorUserId;
    payload.updated_by = actorUserId;
  }
  return payload;
}

function commonUpdatePayload(
  input: { status?: string | undefined; tags?: string[] | undefined },
  actorUserId?: string | null,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  if (input.status !== undefined) payload.status = input.status;
  if (input.tags !== undefined) payload.tags = input.tags ?? [];
  if (actorUserId) payload.updated_by = actorUserId;
  return payload;
}

function parseParameters(raw: unknown): LibraryParameterVariable[] {
  if (!Array.isArray(raw)) return [];
  const out: LibraryParameterVariable[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const value = entry as Record<string, unknown>;
    const key = typeof value.key === "string" ? value.key : null;
    const label = typeof value.label === "string" ? value.label : null;
    if (!key || !label) continue;
    const exemplo = typeof value.exemplo === "string" ? value.exemplo : null;
    out.push({ key, label, exemplo });
  }
  return out;
}

function mapAxis(row: AxisRow): LibraryAxis {
  return {
    ...mapCommon(row),
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    ordem: row.ordem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSection(row: SectionRow): LibrarySection {
  const axisRel = Array.isArray(row.library_axes) ? row.library_axes[0] : row.library_axes;
  return {
    ...mapCommon(row),
    id: row.id,
    axisId: row.axis_id,
    axisCode: axisRel?.code ?? "",
    code: row.code,
    name: row.name,
    description: row.description,
    ordem: row.ordem,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapMetric(row: MetricRow): LibraryMetric {
  const at = row.answer_type as string;
  const answerType: LibraryMetricAnswerType =
    at === "yes_no_partial" ? "yes_no" : (row.answer_type as LibraryMetricAnswerType);
  return {
    ...mapCommon(row),
    id: row.id,
    code: row.code,
    name: row.name,
    description: row.description,
    answerType,
    interpretation: row.interpretation,
    triggerSummary: row.trigger_summary,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRecommendation(row: RecommendationRow): LibraryRecommendationBase {
  return {
    ...mapCommon(row),
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    tipo: row.tipo ?? "nao_implementacao",
    textoBaseFixo: row.texto_base_fixo,
    textoBaseParametrizavel: row.texto_base_parametrizavel,
    variaveisParametro: parseParameters(row.variaveis_parametro),
    fundamentoTecnico: row.fundamento_tecnico,
    escopoAplicacao: row.escopo_aplicacao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapAction(row: ActionRow): LibraryModelAction {
  return {
    ...mapCommon(row),
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    suggestedDeadlineDays: row.suggested_deadline_days,
    suggestedResponsibleArea: row.suggested_responsible_area,
    fundamentoTecnico: row.fundamento_tecnico,
    criterioConclusao: row.criterio_conclusao,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type ItemVersionRow = {
  id: string;
  item_type: LibraryItemType;
  item_id: string;
  version: string;
  version_major: number;
  version_minor: number;
  version_patch: number;
  payload: unknown;
  hash: string;
  vigente_de: string;
  vigente_ate: string | null;
  previous_version_id: string | null;
  published_by: string | null;
  published_at: string;
  deprecated_by: string | null;
  deprecated_at: string | null;
  created_at: string;
};

function mapItemVersion(row: ItemVersionRow): LibraryItemVersion {
  return {
    id: row.id,
    itemType: row.item_type,
    itemId: row.item_id,
    version: row.version,
    versionMajor: row.version_major,
    versionMinor: row.version_minor,
    versionPatch: row.version_patch,
    payload:
      row.payload && typeof row.payload === "object"
        ? (row.payload as Record<string, unknown>)
        : {},
    hash: row.hash,
    vigenteDe: row.vigente_de,
    vigenteAte: row.vigente_ate,
    previousVersionId: row.previous_version_id,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    deprecatedBy: row.deprecated_by,
    deprecatedAt: row.deprecated_at,
    createdAt: row.created_at,
  };
}

export type LibraryActorContext = { userId?: string | null };

export class LibraryRepository {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async listAxes(): Promise<LibraryAxis[]> {
    const { data, error } = await this.supabase
      .from("library_axes")
      .select("*")
      .order("ordem", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapAxis(row as AxisRow));
  }

  async listSections(): Promise<LibrarySection[]> {
    const { data, error } = await this.supabase
      .from("library_sections")
      .select("*, library_axes!inner(code)")
      .order("ordem", { ascending: true })
      .order("name", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapSection(row as SectionRow));
  }

  async listMetrics(): Promise<LibraryMetric[]> {
    const { data, error } = await this.supabase
      .from("library_metrics")
      .select("*")
      .order("code", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapMetric(row as MetricRow));
  }

  async listRecommendations(): Promise<LibraryRecommendationBase[]> {
    const { data, error } = await this.supabase
      .from("library_recommendations")
      .select("*")
      .order("code", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapRecommendation(row as RecommendationRow));
  }

  async listActions(): Promise<LibraryModelAction[]> {
    const { data, error } = await this.supabase
      .from("library_actions")
      .select("*")
      .order("code", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapAction(row as ActionRow));
  }

  /** Biblioteca Geral (admin): eixos, seções, modelos de recomendação e planos de ação. */
  async snapshotCatalog(): Promise<LibraryCatalogSnapshot> {
    const [axes, sections, recommendations, actions] = await Promise.all([
      this.listAxes(),
      this.listSections(),
      this.listRecommendations(),
      this.listActions(),
    ]);
    return { axes, sections, recommendations, actions };
  }

  /** Snapshot completo, incluindo tabelas legadas (metrics/recommendations/actions). */
  async snapshot(): Promise<LibrarySnapshot> {
    const [axes, sections, metrics, recommendations, actions] = await Promise.all([
      this.listAxes(),
      this.listSections(),
      this.listMetrics(),
      this.listRecommendations(),
      this.listActions(),
    ]);
    return { axes, sections, metrics, recommendations, actions };
  }

  async findAxis(id: string): Promise<LibraryAxis | null> {
    const { data, error } = await this.supabase
      .from("library_axes")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapAxis(data as AxisRow) : null;
  }

  async findSection(id: string): Promise<LibrarySection | null> {
    const { data, error } = await this.supabase
      .from("library_sections")
      .select("*, library_axes!inner(code)")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapSection(data as SectionRow) : null;
  }

  async findMetric(id: string): Promise<LibraryMetric | null> {
    const { data, error } = await this.supabase
      .from("library_metrics")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapMetric(data as MetricRow) : null;
  }

  async findRecommendation(id: string): Promise<LibraryRecommendationBase | null> {
    const { data, error } = await this.supabase
      .from("library_recommendations")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRecommendation(data as RecommendationRow) : null;
  }

  async findAction(id: string): Promise<LibraryModelAction | null> {
    const { data, error } = await this.supabase
      .from("library_actions")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? mapAction(data as ActionRow) : null;
  }

  async createAxis(input: LibraryAxisInput, actor: LibraryActorContext = {}): Promise<LibraryAxis> {
    const payload = {
      code: input.code,
      name: input.name,
      description: input.description,
      ordem: input.ordem,
      ...commonInsertPayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_axes")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return mapAxis(data as AxisRow);
  }

  async updateAxis(
    id: string,
    input: LibraryAxisInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryAxis> {
    const payload = {
      code: input.code,
      name: input.name,
      description: input.description,
      ordem: input.ordem,
      ...commonUpdatePayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_axes")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapAxis(data as AxisRow);
  }

  async deleteAxis(id: string): Promise<void> {
    const { error } = await this.supabase.from("library_axes").delete().eq("id", id);
    if (error) throw error;
  }

  async createSection(
    input: LibrarySectionInput,
    actor: LibraryActorContext = {},
  ): Promise<LibrarySection> {
    const payload = {
      axis_id: input.axisId,
      code: input.code,
      name: input.name,
      description: input.description,
      ordem: input.ordem,
      ...commonInsertPayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_sections")
      .insert(payload)
      .select("*, library_axes!inner(code)")
      .single();
    if (error) throw error;
    return mapSection(data as SectionRow);
  }

  async updateSection(
    id: string,
    input: LibrarySectionInput,
    actor: LibraryActorContext = {},
  ): Promise<LibrarySection> {
    const payload = {
      axis_id: input.axisId,
      code: input.code,
      name: input.name,
      description: input.description,
      ordem: input.ordem,
      ...commonUpdatePayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_sections")
      .update(payload)
      .eq("id", id)
      .select("*, library_axes!inner(code)")
      .single();
    if (error) throw error;
    return mapSection(data as SectionRow);
  }

  async deleteSection(id: string): Promise<void> {
    const { error } = await this.supabase.from("library_sections").delete().eq("id", id);
    if (error) throw error;
  }

  async createMetric(
    input: LibraryMetricInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryMetric> {
    const payload = {
      code: input.code,
      name: input.name,
      description: input.description,
      answer_type: input.answerType,
      interpretation: input.interpretation,
      trigger_summary: input.triggerSummary,
      ...commonInsertPayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_metrics")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return mapMetric(data as MetricRow);
  }

  async updateMetric(
    id: string,
    input: LibraryMetricInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryMetric> {
    const payload = {
      code: input.code,
      name: input.name,
      description: input.description,
      answer_type: input.answerType,
      interpretation: input.interpretation,
      trigger_summary: input.triggerSummary,
      ...commonUpdatePayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_metrics")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapMetric(data as MetricRow);
  }

  async deleteMetric(id: string): Promise<void> {
    const { error } = await this.supabase.from("library_metrics").delete().eq("id", id);
    if (error) throw error;
  }

  async createRecommendation(
    input: LibraryRecommendationInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryRecommendationBase> {
    const payload = {
      code: input.code,
      title: input.title,
      description: input.description,
      tipo: input.tipo ?? "nao_implementacao",
      texto_base_fixo: input.textoBaseFixo,
      texto_base_parametrizavel: input.textoBaseParametrizavel,
      variaveis_parametro: input.variaveisParametro ?? [],
      fundamento_tecnico: input.fundamentoTecnico,
      escopo_aplicacao: input.escopoAplicacao,
      ...commonInsertPayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_recommendations")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return mapRecommendation(data as RecommendationRow);
  }

  async updateRecommendation(
    id: string,
    input: LibraryRecommendationInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryRecommendationBase> {
    const payload = {
      code: input.code,
      title: input.title,
      description: input.description,
      tipo: input.tipo ?? "nao_implementacao",
      texto_base_fixo: input.textoBaseFixo,
      texto_base_parametrizavel: input.textoBaseParametrizavel,
      variaveis_parametro: input.variaveisParametro ?? [],
      fundamento_tecnico: input.fundamentoTecnico,
      escopo_aplicacao: input.escopoAplicacao,
      ...commonUpdatePayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_recommendations")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapRecommendation(data as RecommendationRow);
  }

  async deleteRecommendation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from("library_recommendations")
      .delete()
      .eq("id", id);
    if (error) throw error;
  }

  async createAction(
    input: LibraryActionInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryModelAction> {
    const payload = {
      code: input.code,
      title: input.title,
      description: input.description,
      suggested_deadline_days: input.suggestedDeadlineDays,
      suggested_responsible_area: input.suggestedResponsibleArea,
      fundamento_tecnico: input.fundamentoTecnico,
      criterio_conclusao: input.criterioConclusao,
      ...commonInsertPayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_actions")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw error;
    return mapAction(data as ActionRow);
  }

  async updateAction(
    id: string,
    input: LibraryActionInput,
    actor: LibraryActorContext = {},
  ): Promise<LibraryModelAction> {
    const payload = {
      code: input.code,
      title: input.title,
      description: input.description,
      suggested_deadline_days: input.suggestedDeadlineDays,
      suggested_responsible_area: input.suggestedResponsibleArea,
      fundamento_tecnico: input.fundamentoTecnico,
      criterio_conclusao: input.criterioConclusao,
      ...commonUpdatePayload(input, actor.userId),
    };
    const { data, error } = await this.supabase
      .from("library_actions")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return mapAction(data as ActionRow);
  }

  async deleteAction(id: string): Promise<void> {
    const { error } = await this.supabase.from("library_actions").delete().eq("id", id);
    if (error) throw error;
  }

  async updateItemStatus(
    tableName:
      | "library_axes"
      | "library_sections"
      | "library_metrics"
      | "library_recommendations"
      | "library_actions",
    id: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    const { error } = await this.supabase.from(tableName).update(patch).eq("id", id);
    if (error) throw error;
  }

  async insertItemVersion(payload: {
    itemType: LibraryItemType;
    itemId: string;
    version: string;
    versionMajor: number;
    versionMinor: number;
    versionPatch: number;
    payload: Record<string, unknown>;
    hash: string;
    vigenteDe: string;
    previousVersionId: string | null;
    publishedBy: string | null;
  }): Promise<LibraryItemVersion> {
    const insertPayload = {
      item_type: payload.itemType,
      item_id: payload.itemId,
      version: payload.version,
      version_major: payload.versionMajor,
      version_minor: payload.versionMinor,
      version_patch: payload.versionPatch,
      payload: payload.payload,
      hash: payload.hash,
      vigente_de: payload.vigenteDe,
      previous_version_id: payload.previousVersionId,
      published_by: payload.publishedBy,
    };
    const { data, error } = await this.supabase
      .from("library_item_versions")
      .insert(insertPayload)
      .select("*")
      .single();
    if (error) throw error;
    return mapItemVersion(data as ItemVersionRow);
  }

  async findVersionById(versionId: string): Promise<LibraryItemVersion | null> {
    const { data, error } = await this.supabase
      .from("library_item_versions")
      .select("*")
      .eq("id", versionId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapItemVersion(data as ItemVersionRow) : null;
  }

  async findLatestVersion(
    itemType: LibraryItemType,
    itemId: string,
  ): Promise<LibraryItemVersion | null> {
    const { data, error } = await this.supabase
      .from("library_item_versions")
      .select("*")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .order("published_at", { ascending: false })
      .limit(1);
    if (error) throw error;
    const [row] = data ?? [];
    return row ? mapItemVersion(row as ItemVersionRow) : null;
  }

  async findLatestVersionsByItemIds(
    itemType: LibraryItemType,
    itemIds: string[],
  ): Promise<Map<string, LibraryItemVersion>> {
    const map = new Map<string, LibraryItemVersion>();
    const unique = Array.from(new Set(itemIds)).filter(Boolean);
    if (unique.length === 0) return map;
    const { data, error } = await this.supabase
      .from("library_item_versions")
      .select("*")
      .eq("item_type", itemType)
      .in("item_id", unique)
      .order("published_at", { ascending: false });
    if (error) throw error;
    for (const row of data ?? []) {
      const mapped = mapItemVersion(row as ItemVersionRow);
      if (!map.has(mapped.itemId)) map.set(mapped.itemId, mapped);
    }
    return map;
  }

  async listVersions(
    itemType: LibraryItemType,
    itemId: string,
  ): Promise<LibraryItemVersion[]> {
    const { data, error } = await this.supabase
      .from("library_item_versions")
      .select("*")
      .eq("item_type", itemType)
      .eq("item_id", itemId)
      .order("published_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapItemVersion(row as ItemVersionRow));
  }

  async closeVersion(versionId: string, deprecatedBy: string | null): Promise<void> {
    const { error } = await this.supabase
      .from("library_item_versions")
      .update({
        vigente_ate: new Date().toISOString(),
        deprecated_by: deprecatedBy,
        deprecated_at: new Date().toISOString(),
      })
      .eq("id", versionId);
    if (error) throw error;
  }

  async nextOrdemForAxes(): Promise<number> {
    const { data, error } = await this.supabase
      .from("library_axes")
      .select("ordem")
      .order("ordem", { ascending: false })
      .limit(1);
    if (error) throw error;
    const current = data?.[0]?.ordem;
    return typeof current === "number" ? current + 1 : 0;
  }

  async nextOrdemForSectionsByAxis(axisId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from("library_sections")
      .select("ordem")
      .eq("axis_id", axisId)
      .order("ordem", { ascending: false })
      .limit(1);
    if (error) throw error;
    const current = data?.[0]?.ordem;
    return typeof current === "number" ? current + 1 : 0;
  }

  async isCodeTaken(
    table:
      | "library_axes"
      | "library_sections"
      | "library_metrics"
      | "library_recommendations"
      | "library_actions",
    code: string,
  ): Promise<boolean> {
    const { data, error } = await this.supabase
      .from(table)
      .select("id")
      .eq("code", code)
      .limit(1);
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }
}
