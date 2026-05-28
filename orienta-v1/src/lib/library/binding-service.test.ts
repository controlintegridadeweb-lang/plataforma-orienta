import { describe, expect, it } from "vitest";
import {
  computeCoverageScore,
  computeSnapshotHash,
  computeSnapshotHashInput,
  scenarioBindingHasRecommendation,
  validateBindingForPublish,
} from "./binding-service";
import { getRequiredScenariosFor } from "./binding-types";
import type { QuestionLibraryBinding } from "./binding-types";

describe("scenarioBindingHasRecommendation", () => {
  it("accepts legacy recommendationId", () => {
    expect(
      scenarioBindingHasRecommendation({
        recommendationId: "00000000-0000-4000-8000-000000000001",
        actionIds: [],
      }),
    ).toBe(true);
  });

  it("accepts inline title", () => {
    expect(
      scenarioBindingHasRecommendation({
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "Fazer X" },
      }),
    ).toBe(true);
  });

  it("rejects empty", () => {
    expect(
      scenarioBindingHasRecommendation({
        recommendationId: null,
        actionIds: [],
      }),
    ).toBe(false);
  });
});

describe("computeCoverageScore with inline recommendations", () => {
  it("counts scenarios covered by inline title", () => {
    const score = computeCoverageScore({
      nao: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "R1" },
      },
      nao_se_aplica: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "R2" },
      },
      sim_sem_evidencia: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "R3" },
      },
      sim_evidencia_invalida: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "R4" },
      },
    });
    expect(score).toBe(100);
  });
});

describe("validateBindingForPublish", () => {
  function fullBindings(): QuestionLibraryBinding["bindings"] {
    return {
      nao: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "A" },
      },
      nao_se_aplica: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "B" },
      },
      sim_sem_evidencia: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "C" },
      },
      sim_evidencia_invalida: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "D" },
      },
    };
  }

  function baseBinding(
    overrides: Partial<QuestionLibraryBinding> = {},
  ): QuestionLibraryBinding {
    return {
      questionId: "00000000-0000-4000-8000-000000000099",
      axisId: "00000000-0000-4000-8000-0000000000a1",
      sectionId: "00000000-0000-4000-8000-0000000000a2",
      metricId: null,
      metric: {
        name: "Cobertura de controles",
        description: null,
        answerType: "scale",
        interpretation: "higher_better",
        },
      bindings: fullBindings(),
      responseMapping: {},
      coverageScore: 100,
      updatedBy: null,
      updatedAt: "2025-01-01T00:00:00Z",
      ...overrides,
    };
  }

  it("passes with inline recommendations and inline metric", () => {
    const r = validateBindingForPublish(baseBinding());
    expect(r.valid).toBe(true);
    expect(r.missing.length).toBe(0);
  });

  it("fails when inline metric is missing", () => {
    const r = validateBindingForPublish(baseBinding({ metric: null }));
    expect(r.valid).toBe(false);
  });

  it("fails when required scenarios are missing", () => {
    const r = validateBindingForPublish(
      baseBinding({ bindings: {} }),
    );
    expect(r.valid).toBe(false);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("fails when sectionId is missing", () => {
    const r = validateBindingForPublish(
      baseBinding({ sectionId: null }),
    );
    expect(r.valid).toBe(false);
  });

  it("fails when inline metric lacks name", () => {
    const r = validateBindingForPublish(
      baseBinding({
        metric: {
          name: "",
          description: null,
          answerType: "scale",
          interpretation: "higher_better",
          },
      }),
    );
    expect(r.valid).toBe(false);
  });

  it("passes without FAMI slots when requiresEvidence=false (scale com nao e nao_se_aplica)", () => {
    const r = validateBindingForPublish(
      baseBinding({
        metric: {
          name: "Checklist",
          description: null,
          answerType: "scale",
          interpretation: "higher_better",
          },
        bindings: {
          nao: {
            recommendationId: null,
            actionIds: [],
            recommendation: { title: "A" },
          },
          nao_se_aplica: {
            recommendationId: null,
            actionIds: [],
            recommendation: { title: "B" },
          },
        },
      }),
      { requiresEvidence: false },
    );
    expect(r.valid).toBe(true);
  });

  it("still requires FAMI when requiresEvidence=true (scale)", () => {
    const r = validateBindingForPublish(
      baseBinding({
        metric: {
          name: "Checklist",
          description: null,
          answerType: "scale",
          interpretation: "higher_better",
          },
        bindings: {
          nao: {
            recommendationId: null,
            actionIds: [],
            recommendation: { title: "A" },
          },
          nao_se_aplica: {
            recommendationId: null,
            actionIds: [],
            recommendation: { title: "B" },
          },
        },
      }),
      { requiresEvidence: true },
    );
    expect(r.valid).toBe(false);
    expect(r.missing).toContain("sim_evidencia_invalida");
  });

  it("passes for yes_no + requiresEvidence=false with only 'nao' filled", () => {
    const r = validateBindingForPublish(
      baseBinding({
        metric: {
          name: "Checklist",
          description: null,
          answerType: "yes_no",
          interpretation: "qualitative",
          },
        bindings: {
          nao: {
            recommendationId: null,
            actionIds: [],
            recommendation: { title: "A" },
          },
        },
      }),
      { requiresEvidence: false },
    );
    expect(r.valid).toBe(true);
  });

  it("passes for text answerType regardless of scenarios", () => {
    const r = validateBindingForPublish(
      baseBinding({
        metric: {
          name: "Observacao",
          description: null,
          answerType: "text",
          interpretation: "qualitative",
          },
        bindings: {},
      }),
      { requiresEvidence: true },
    );
    expect(r.valid).toBe(true);
  });
});

describe("getRequiredScenariosFor", () => {
  it("yes_no + evidencia -> nao + evidencia invalida", () => {
    expect(getRequiredScenariosFor("yes_no", true)).toEqual([
      "nao",
      "sim_evidencia_invalida",
    ]);
  });

  it("yes_no sem evidencia -> so nao", () => {
    expect(getRequiredScenariosFor("yes_no", false)).toEqual(["nao"]);
  });

  it("text -> vazio", () => {
    expect(getRequiredScenariosFor("text", true)).toEqual([]);
    expect(getRequiredScenariosFor("text", false)).toEqual([]);
  });

  it("scale e numeric incluem nao_se_aplica nos cenarios base", () => {
    expect(getRequiredScenariosFor("scale", false)).toEqual([
      "nao",
      "nao_se_aplica",
    ]);
    expect(getRequiredScenariosFor("numeric", true)).toEqual([
      "nao",
      "nao_se_aplica",
      "sim_evidencia_invalida",
    ]);
  });

  it("sem answerType -> vazio", () => {
    expect(getRequiredScenariosFor(null, true)).toEqual([]);
    expect(getRequiredScenariosFor(undefined, false)).toEqual([]);
  });
});

describe("computeCoverageScore dinamico", () => {
  it("scale sem evidencia exige 2 slots (nao e nao_se_aplica)", () => {
    const score = computeCoverageScore(
      {
        nao: {
          recommendationId: null,
          actionIds: [],
          recommendation: { title: "A" },
        },
        nao_se_aplica: {
          recommendationId: null,
          actionIds: [],
          recommendation: { title: "B" },
        },
      },
      { answerType: "scale", requiresEvidence: false },
    );
    expect(score).toBe(100);
  });

  it("scale com evidencia e apenas 2 slots preenchidos -> ~67%", () => {
    const score = computeCoverageScore(
      {
        nao: {
          recommendationId: null,
          actionIds: [],
          recommendation: { title: "A" },
        },
        nao_se_aplica: {
          recommendationId: null,
          actionIds: [],
          recommendation: { title: "B" },
        },
      },
      { answerType: "scale", requiresEvidence: true },
    );
    expect(score).toBe(66.67);
  });

  it("text -> sempre 100 (sem cenarios)", () => {
    const score = computeCoverageScore(
      {},
      { answerType: "text", requiresEvidence: true },
    );
    expect(score).toBe(100);
  });
});

describe("computeSnapshotHash", () => {
  const baseInput = computeSnapshotHashInput({
    axisVersionId: "axv",
    sectionVersionId: "sv",
    metric: {
      name: "Cobertura",
      description: null,
      answerType: "scale",
      interpretation: "higher_better",
      },
    recommendationVersionIds: ["rv"],
    actionVersionIds: ["av"],
    bindings: {
      nao: {
        recommendationId: null,
        actionIds: [],
        recommendation: { title: "X" },
      },
    },
    responseMapping: {},
  });

  it("is stable for identical input", () => {
    expect(computeSnapshotHash(baseInput)).toBe(computeSnapshotHash(baseInput));
  });

  it("changes when inline metric changes", () => {
    const other = computeSnapshotHashInput({
      ...baseInput,
      metric: {
        name: "Cobertura",
        description: "agora com descricao",
        answerType: "scale",
        interpretation: "higher_better",
        },
    });
    expect(computeSnapshotHash(baseInput)).not.toBe(computeSnapshotHash(other));
  });

  it("changes when responseMapping changes", () => {
    const other = computeSnapshotHashInput({
      ...baseInput,
      responseMapping: { scaleBands: { failMax: 2, notApplicableMax: 4 } },
    });
    expect(computeSnapshotHash(baseInput)).not.toBe(computeSnapshotHash(other));
  });
});
