export type LibraryMetricAnswerType = "yes_no" | "scale" | "numeric" | "text";

export type LibraryMetricInterpretation = "higher_better" | "lower_better" | "qualitative";

export type LibraryItemStatus =
  | "draft"
  | "in_review"
  | "published"
  | "deprecated"
  | "archived";

export type LibraryRecommendationType =
  | "nao_implementacao"
  | "implementacao_parcial"
  | "ausencia_evidencia"
  | "evidencia_insuficiente";

/** Entidades expostas na Biblioteca Geral (admin): eixos, seções, modelos de recomendação e planos de ação. */
export type LibraryCatalogEntity = "axes" | "sections" | "recommendations" | "actions";

/** Entidade completa (inclui métricas legadas em `library_*` e auditoria). */
export type LibraryEntity = LibraryCatalogEntity | "metrics";

export type LibraryItemType = "axis" | "section" | "metric" | "recommendation" | "action";

export type LibraryParameterVariable = {
  key: string;
  label: string;
  exemplo?: string | null;
};

export type LibraryCommonFields = {
  status: LibraryItemStatus;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  version: string;
  vigenteDe: string | null;
  vigenteAte: string | null;
  tags: string[];
  createdBy: string | null;
  updatedBy: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  deprecatedBy: string | null;
  deprecatedAt: string | null;
};

export type LibraryAxis = LibraryCommonFields & {
  id: string;
  code: string;
  name: string;
  description: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
};

export type LibrarySection = LibraryCommonFields & {
  id: string;
  axisId: string;
  axisCode: string;
  code: string;
  name: string;
  description: string | null;
  ordem: number;
  createdAt: string;
  updatedAt: string;
};

export type LibraryMetric = LibraryCommonFields & {
  id: string;
  code: string;
  name: string;
  description: string | null;
  answerType: LibraryMetricAnswerType;
  interpretation: LibraryMetricInterpretation;
  triggerSummary: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryRecommendationBase = LibraryCommonFields & {
  id: string;
  code: string;
  title: string;
  description: string | null;
  tipo: LibraryRecommendationType;
  textoBaseFixo: string | null;
  textoBaseParametrizavel: string | null;
  variaveisParametro: LibraryParameterVariable[];
  fundamentoTecnico: string | null;
  escopoAplicacao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryModelAction = LibraryCommonFields & {
  id: string;
  code: string;
  title: string;
  description: string | null;
  suggestedDeadlineDays: number;
  suggestedResponsibleArea: string | null;
  fundamentoTecnico: string | null;
  criterioConclusao: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LibraryItem =
  | LibraryAxis
  | LibrarySection
  | LibraryMetric
  | LibraryRecommendationBase
  | LibraryModelAction;

export type LibraryCatalogItem =
  | LibraryAxis
  | LibrarySection
  | LibraryRecommendationBase
  | LibraryModelAction;

/** Snapshot usado pela tela Biblioteca Geral. */
export type LibraryCatalogSnapshot = {
  axes: LibraryAxis[];
  sections: LibrarySection[];
  recommendations: LibraryRecommendationBase[];
  actions: LibraryModelAction[];
};

/** Snapshot completo (legado / ferramentas internas). */
export type LibrarySnapshot = LibraryCatalogSnapshot & {
  metrics: LibraryMetric[];
};

export type LibraryItemVersion = {
  id: string;
  itemType: LibraryItemType;
  itemId: string;
  version: string;
  versionMajor: number;
  versionMinor: number;
  versionPatch: number;
  payload: Record<string, unknown>;
  hash: string;
  vigenteDe: string;
  vigenteAte: string | null;
  previousVersionId: string | null;
  publishedBy: string | null;
  publishedAt: string;
  deprecatedBy: string | null;
  deprecatedAt: string | null;
  createdAt: string;
};

export const LIBRARY_CATALOG_ENTITIES: readonly LibraryCatalogEntity[] = [
  "axes",
  "sections",
  "recommendations",
  "actions",
] as const;

export const LIBRARY_ENTITIES: readonly LibraryEntity[] = [
  ...LIBRARY_CATALOG_ENTITIES,
  "metrics",
] as const;

export const LIBRARY_ITEM_TYPE_BY_ENTITY: Record<LibraryEntity, LibraryItemType> = {
  axes: "axis",
  sections: "section",
  metrics: "metric",
  recommendations: "recommendation",
  actions: "action",
};

export const LIBRARY_ENTITY_BY_ITEM_TYPE: Record<LibraryItemType, LibraryEntity> = {
  axis: "axes",
  section: "sections",
  metric: "metrics",
  recommendation: "recommendations",
  action: "actions",
};

export const LIBRARY_ANSWER_TYPES: readonly LibraryMetricAnswerType[] = [
  "yes_no",
  "scale",
  "numeric",
  "text",
] as const;

export const LIBRARY_INTERPRETATIONS: readonly LibraryMetricInterpretation[] = [
  "higher_better",
  "lower_better",
  "qualitative",
] as const;

export const LIBRARY_ITEM_STATUSES: readonly LibraryItemStatus[] = [
  "draft",
  "in_review",
  "published",
  "deprecated",
  "archived",
] as const;

export const LIBRARY_RECOMMENDATION_TYPES: readonly LibraryRecommendationType[] = [
  "nao_implementacao",
  "implementacao_parcial",
  "ausencia_evidencia",
  "evidencia_insuficiente",
] as const;
