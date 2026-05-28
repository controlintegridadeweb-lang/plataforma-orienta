export type LibraryScenarioKey =
  | "nao"
  | "sim_sem_evidencia"
  | "sim_evidencia_invalida"
  | "sim_evidencia_valida"
  | "nao_se_aplica"
  | "em_andamento"
  | "nao_sabe"
  | "em_revisao"
  | "fora_de_escopo";

export const LIBRARY_SCENARIOS: readonly LibraryScenarioKey[] = [
  "nao",
  "sim_sem_evidencia",
  "sim_evidencia_invalida",
  "sim_evidencia_valida",
  "nao_se_aplica",
  "em_andamento",
  "nao_sabe",
  "em_revisao",
  "fora_de_escopo",
] as const;

export const LIBRARY_SCENARIO_LABEL: Record<LibraryScenarioKey, string> = {
  nao: "Não",
  sim_sem_evidencia: "Sim, sem evidência",
  sim_evidencia_invalida: "Sim, evidência inválida",
  sim_evidencia_valida: "Sim, evidência válida",
  nao_se_aplica: "Não se aplica",
  em_andamento: "Em andamento",
  nao_sabe: "Não sabe",
  em_revisao: "Em revisão",
  fora_de_escopo: "Fora de escopo",
};

export const LIBRARY_REQUIRED_SCENARIOS: readonly LibraryScenarioKey[] = [
  "nao",
  "nao_se_aplica",
  "sim_evidencia_invalida",
];

/**
 * Retorna os cenarios exibidos/obrigatorios para uma combinacao de tipo de
 * resposta da pergunta e a flag `requires_evidence`. A ideia e simplificar o
 * painel: o admin so escolhe "tipo de resposta" e o sistema calcula que slots
 * de recomendacao fazem sentido.
 *
 * - yes_no           -> { nao }                          (+ FAMI se exige evidencia)
 * - scale / numeric  -> { nao, nao_se_aplica }           (via responseMapping)
 * - text             -> {} (apenas observacao opcional; sem cenarios obrigatorios)
 *
 * Quando `requiresEvidence=true`, acrescenta `sim_evidencia_invalida` para todos
 * os tipos exceto `text`. Respostas "Sim" sem evidência são bloqueadas no
 * workbench — não há cenário separado para isso.
 */
export function getRequiredScenariosFor(
  answerType: InlineMetric["answerType"] | null | undefined,
  requiresEvidence: boolean,
): LibraryScenarioKey[] {
  if (!answerType) return [];
  const base: LibraryScenarioKey[] = [];
  switch (answerType) {
    case "yes_no":
      base.push("nao");
      break;
    case "scale":
    case "numeric":
      base.push("nao", "nao_se_aplica");
      break;
    case "text":
      return [];
  }
  if (requiresEvidence) {
    base.push("sim_evidencia_invalida");
  }
  return base;
}

/** Conteúdo de recomendação definido no formulário (não depende de `library_recommendations`). */
export type InlineLibraryRecommendation = {
  title: string;
  description?: string | null;
  textoBaseFixo?: string | null;
  textoBaseParametrizavel?: string | null;
  tipo?:
    | "nao_implementacao"
    | "ausencia_evidencia"
    | "evidencia_insuficiente"
    | null;
  fundamentoTecnico?: string | null;
  escopoAplicacao?: string | null;
};

/** Ação-modelo definida no formulário (não depende de `library_actions`). */
export type InlineLibraryAction = {
  title: string;
  description?: string | null;
  suggestedDeadlineDays?: number | null;
  suggestedResponsibleArea?: string | null;
  fundamentoTecnico?: string | null;
  criterioConclusao?: string | null;
};

export type LibraryScenarioBinding = {
  /** Legado: ID em `library_recommendations` (publicado). */
  recommendationId: string | null;
  /** Legado: IDs em `library_actions`. */
  actionIds: string[];
  /** Novo: recomendação por cenário, cadastrada no vínculo da pergunta. */
  recommendation?: InlineLibraryRecommendation | null;
  /** Novo: ações por cenário, cadastradas no vínculo da pergunta. */
  actions?: InlineLibraryAction[];
  note?: string | null;
};

export type LibraryBindings = Partial<Record<LibraryScenarioKey, LibraryScenarioBinding>>;

/**
 * Mapeamento por pergunta de respostas em escala (1..5) e numericas para o trio
 * yes/no/not_applicable usado pelo motor v2. Definicao canonica em
 * `metric-response-mapper.ts` (com `ScaleBands` e `NumericThresholds`).
 */
import type { ResponseMapping } from "./metric-response-mapper";
export type { ResponseMapping };

/**
 * Metrica inline definida no proprio vinculo da pergunta. Substitui a antiga
 * referencia `metricId -> library_metrics`. Nao existe reuso entre formularios:
 * cada pergunta carrega seus metadados de metrica e seu response_mapping.
 */
export type InlineMetric = {
  name: string;
  description?: string | null;
  answerType: "yes_no" | "scale" | "numeric" | "text";
  interpretation: "higher_better" | "lower_better" | "qualitative";
};

export type QuestionLibraryBinding = {
  questionId: string;
  axisId: string | null;
  sectionId: string | null;
  /** @deprecated Legado; novos vinculos usam `metric` inline. Mantido para compat. */
  metricId: string | null;
  metric: InlineMetric | null;
  bindings: LibraryBindings;
  responseMapping: ResponseMapping;
  coverageScore: number;
  updatedBy: string | null;
  updatedAt: string;
};

export type FormQuestionLibrarySnapshot = {
  formId: string;
  formVersion: number;
  questionId: string;
  axisVersionId: string | null;
  sectionVersionId: string | null;
  /** @deprecated Legado; o snapshot atual grava `metric` inline. */
  metricVersionId: string | null;
  metric: InlineMetric | null;
  recommendationVersionIds: string[];
  actionVersionIds: string[];
  bindings: LibraryBindings;
  responseMapping: ResponseMapping;
  capturedAt: string;
  hash: string;
};
