import { describe, expect, it } from "vitest";
import {
  buildRecommendationFromSnapshot,
  renderTemplate,
  resolveScenario,
} from "./recommendation-engine-v2";
import type { FormQuestionLibrarySnapshot } from "@/lib/library/binding-types";

describe("recommendation-engine-v2 scenarios", () => {
  it("maps each scenario", () => {
    expect(resolveScenario({ answer: "no", requiresEvidence: false }).scenario).toBe(
      "nao",
    );
    expect(
      resolveScenario({ answer: "not_applicable", requiresEvidence: false }).scenario,
    ).toBe("nao_se_aplica");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: true,
        hasEvidenceSubmitted: false,
      }).scenario,
    ).toBe("sim_sem_evidencia");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: true,
        hasEvidenceSubmitted: true,
        validationStatus: "invalidated",
      }).scenario,
    ).toBe("sim_evidencia_invalida");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: true,
        hasEvidenceSubmitted: true,
        validationStatus: "approved",
      }).scenario,
    ).toBe("sim_evidencia_valida");
    expect(
      resolveScenario({ answer: "yes", requiresEvidence: false, isNotApplicable: true })
        .scenario,
    ).toBe("nao_se_aplica");
    expect(
      resolveScenario({ answer: "yes", requiresEvidence: false, isInProgress: true })
        .scenario,
    ).toBe("em_andamento");
    expect(
      resolveScenario({ answer: "yes", requiresEvidence: false, answeredUnknown: true })
        .scenario,
    ).toBe("nao_sabe");
    expect(
      resolveScenario({ answer: "yes", requiresEvidence: false, isInReview: true })
        .scenario,
    ).toBe("em_revisao");
    expect(
      resolveScenario({ answer: "yes", requiresEvidence: false, isOutOfScope: true })
        .scenario,
    ).toBe("fora_de_escopo");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: false,
        isFreeTextAnswer: true,
        validationStatus: "invalidated",
      }).scenario,
    ).toBe("sim_evidencia_invalida");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: false,
        isFreeTextAnswer: true,
        validationStatus: "approved",
      }).scenario,
    ).toBe("sim_evidencia_valida");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: false,
        isFreeTextAnswer: true,
        validationStatus: "pending",
      }).scenario,
    ).toBe("sim_sem_evidencia");
    expect(
      resolveScenario({
        answer: "yes",
        requiresEvidence: false,
        isFreeTextAnswer: true,
        validationStatus: "adjustment_requested",
      }).scenario,
    ).toBe("sim_sem_evidencia");
  });
});

describe("buildRecommendationFromSnapshot", () => {
  const snapshot: FormQuestionLibrarySnapshot = {
    formId: "00000000-0000-4000-8000-000000000001",
    formVersion: 1,
    questionId: "00000000-0000-4000-8000-000000000010",
    axisVersionId: "axv",
    sectionVersionId: "sv",
    metricVersionId: null,
    metric: {
      name: "Cobertura de controles",
      description: null,
      answerType: "yes_no",
      interpretation: "higher_better",
      },
    recommendationVersionIds: ["rv-nao"],
    actionVersionIds: ["av-nao"],
    bindings: {
      nao: {
        recommendationId: "rec-nao",
        actionIds: ["act-nao"],
        note: "Disparo prioritario",
      },
    },
    responseMapping: {},
    capturedAt: "2025-01-01T00:00:00Z",
    hash: "abc",
  };

  it("returns null when scenario has no binding", () => {
    const result = buildRecommendationFromSnapshot({
      snapshot,
      input: { answer: "yes", requiresEvidence: false },
    });
    expect(result).toBeNull();
  });

  it("resolves recommendation when scenario matches binding", () => {
    const result = buildRecommendationFromSnapshot({
      snapshot,
      input: { answer: "no", requiresEvidence: false },
      parameters: { orgao: "Prefeitura" },
      recommendationTextResolver: () => ({
        textoBaseFixo: "Implemente a politica conforme a LGPD.",
        textoBaseParametrizavel: "Aplique ao contexto {{orgao}}.",
      }),
    });
    expect(result?.scenario).toBe("nao");
    
    expect(result?.recommendationVersionId).toBe("rv-nao");
    expect(result?.renderedText).toContain("Prefeitura");
  });

  it("returns null for 'yes' when pergunta nao exige evidencia e bindings so tem nao", () => {
    const snap: FormQuestionLibrarySnapshot = {
      ...snapshot,
      metric: {
        name: "Checklist",
        description: null,
        answerType: "scale",
        interpretation: "qualitative",
        },
      recommendationVersionIds: [],
      actionVersionIds: [],
      bindings: {
        nao: {
          recommendationId: null,
          actionIds: [],
          recommendation: { title: "Implemente o controle" },
        },
      },
    };
    // Usuario respondeu "sim"; pergunta nao exige evidencia. Como nao existe
    // slot para esse caso, o engine deve retornar null (nao quebrar).
    const yesResult = buildRecommendationFromSnapshot({
      snapshot: snap,
      input: { answer: "yes", requiresEvidence: false },
    });
    expect(yesResult).toBeNull();
    // Respondeu "nao" -> retorna a recomendacao.
    const noResult = buildRecommendationFromSnapshot({
      snapshot: snap,
      input: { answer: "no", requiresEvidence: false },
    });
    expect(noResult?.scenario).toBe("nao");
  });

  it("renders inline recommendation from form binding without library version", () => {
    const snap: FormQuestionLibrarySnapshot = {
      ...snapshot,
      recommendationVersionIds: [],
      actionVersionIds: [],
      bindings: {
        nao: {
          recommendationId: null,
          actionIds: [],
          recommendation: {
            title: "Acao necessaria",
            textoBaseFixo: "Base fixa.",
            textoBaseParametrizavel: "Detalhe {{orgao}}.",
          },
          },
      },
    };
    const result = buildRecommendationFromSnapshot({
      snapshot: snap,
      input: { answer: "no", requiresEvidence: false },
      parameters: { orgao: "Municipio" },
    });
    expect(result?.recommendationVersionId).toBeNull();
    expect(result?.renderedText).toContain("Acao necessaria");
    expect(result?.renderedText).toContain("Municipio");
  });
});

describe("renderTemplate", () => {
  it("substitutes known variables", () => {
    expect(renderTemplate("Oi {{nome}}", { nome: "Rui" })).toBe("Oi Rui");
  });

  it("preserves unknown placeholders", () => {
    expect(renderTemplate("{{a}} {{b}}", { a: "X" })).toBe("X {{b}}");
  });
});
