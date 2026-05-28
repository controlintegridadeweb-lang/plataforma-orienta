import type {
  FormQuestionLibrarySnapshot,
  LibraryScenarioKey,
} from "@/lib/library/binding-types";
import { LIBRARY_SCENARIOS } from "@/lib/library/binding-types";
import { scenarioBindingHasRecommendation } from "@/lib/library/binding-service";
import type { AnswerValue, ValidationStatus } from "./types";

export type ScenarioInput = {
  answer: AnswerValue | "dont_know" | "in_review" | "out_of_scope";
  requiresEvidence: boolean;
  validationStatus?: ValidationStatus;
  isNotApplicable?: boolean;
  isInReview?: boolean;
  isOutOfScope?: boolean;
  hasEvidenceSubmitted?: boolean;
  isInProgress?: boolean;
  answeredUnknown?: boolean;
  /** Resposta em texto livre: cenário definido pelo status de validação da evidência. */
  isFreeTextAnswer?: boolean;
};

type ScenarioResolution = {
  scenario: LibraryScenarioKey;
  confidence: number;
};

type RecommendationFromSnapshot = {
  snapshotHash: string;
  scenario: LibraryScenarioKey;
  recommendationVersionId: string | null;
  actionVersionIds: string[];
  note: string | null;
  confidenceScore: number;
  ruleVersion: string;
  renderedText: string | null;
};

export const RULE_VERSION = "2025-04-biblioteca-v1";

export function resolveScenario(input: ScenarioInput): ScenarioResolution {
  if (input.isOutOfScope) return { scenario: "fora_de_escopo", confidence: 1 };
  if (input.isInReview) return { scenario: "em_revisao", confidence: 1 };
  if (input.isNotApplicable) return { scenario: "nao_se_aplica", confidence: 1 };
  if (input.answer === "not_applicable") return { scenario: "nao_se_aplica", confidence: 1 };
  if (input.answeredUnknown) return { scenario: "nao_sabe", confidence: 0.7 };
  if (input.isInProgress) return { scenario: "em_andamento", confidence: 0.8 };

  if (input.isFreeTextAnswer) {
    if (input.validationStatus === "invalidated") {
      return { scenario: "sim_evidencia_invalida", confidence: 0.85 };
    }
    if (input.validationStatus === "approved") {
      return { scenario: "sim_evidencia_valida", confidence: 1 };
    }
    return { scenario: "sim_sem_evidencia", confidence: 0.7 };
  }

  if (input.answer === "no") {
    return { scenario: "nao", confidence: 1 };
  }
  if (input.answer === "yes") {
    if (!input.requiresEvidence) {
      return { scenario: "sim_evidencia_valida", confidence: 0.6 };
    }
    if (!input.hasEvidenceSubmitted) {
      return { scenario: "sim_sem_evidencia", confidence: 0.9 };
    }
    if (
      input.validationStatus === "invalidated"
    ) {
      return { scenario: "sim_evidencia_invalida", confidence: 0.9 };
    }
    if (input.validationStatus === "approved") {
      return { scenario: "sim_evidencia_valida", confidence: 1 };
    }
    return { scenario: "sim_sem_evidencia", confidence: 0.6 };
  }
  return { scenario: "em_revisao", confidence: 0.3 };
}

type ParameterValues = Record<string, string | number | null | undefined>;

export function renderTemplate(
  template: string | null,
  values: ParameterValues = {},
): string | null {
  if (!template) return null;
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => {
    const value = values[key];
    if (value === undefined || value === null) return `{{${key}}}`;
    return String(value);
  });
}

function legacyRecommendationVersionIdForScenario(
  snapshot: FormQuestionLibrarySnapshot,
  scenario: LibraryScenarioKey,
): string | null {
  let idx = 0;
  for (const key of LIBRARY_SCENARIOS) {
    const s = snapshot.bindings[key];
    if (s?.recommendationId) {
      if (key === scenario) {
        return snapshot.recommendationVersionIds[idx] ?? null;
      }
      idx += 1;
    }
  }
  return null;
}

export function buildRecommendationFromSnapshot(params: {
  snapshot: FormQuestionLibrarySnapshot;
  input: ScenarioInput;
  parameters?: ParameterValues;
  recommendationTextResolver?: (versionId: string) => {
    textoBaseFixo: string | null;
    textoBaseParametrizavel: string | null;
  } | null;
}): RecommendationFromSnapshot | null {
  const resolution = resolveScenario(params.input);
  const slot = params.snapshot.bindings[resolution.scenario];
  if (!slot || !scenarioBindingHasRecommendation(slot)) {
    return null;
  }

  const inline = slot.recommendation;
  let recommendationVersionId: string | null = null;
  let renderedText: string | null = null;

  if (inline?.title?.trim()) {
    const fixo = inline.textoBaseFixo ?? "";
    const param = renderTemplate(
      inline.textoBaseParametrizavel ?? null,
      params.parameters,
    );
    const parts = [
      inline.title,
      inline.description,
      fixo,
      param,
    ].filter((v) => v && String(v).trim().length > 0) as string[];
    renderedText = parts.length > 0 ? parts.join("\n\n") : inline.title;
  } else if (slot.recommendationId) {
    recommendationVersionId = legacyRecommendationVersionIdForScenario(
      params.snapshot,
      resolution.scenario,
    );
    if (recommendationVersionId && params.recommendationTextResolver) {
      const template = params.recommendationTextResolver(recommendationVersionId);
      if (template) {
        const fixo = template.textoBaseFixo ?? "";
        const param = renderTemplate(
          template.textoBaseParametrizavel,
          params.parameters,
        );
        renderedText = [fixo, param].filter((v) => v && v.length > 0).join("\n\n");
      }
    }
  }

  const actionVersionIds = params.snapshot.actionVersionIds ?? [];

  return {
    snapshotHash: params.snapshot.hash,
    scenario: resolution.scenario,
    recommendationVersionId,
    actionVersionIds,
    note: slot.note ?? null,
    confidenceScore: resolution.confidence,
    ruleVersion: RULE_VERSION,
    renderedText,
  };
}

