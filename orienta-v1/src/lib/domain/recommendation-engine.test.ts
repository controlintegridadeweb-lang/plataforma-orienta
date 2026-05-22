import { describe, expect, it } from "vitest";
import { inferRecommendationType } from "./recommendation-engine";

describe("inferRecommendationType", () => {
  it("gera not_implemented para resposta negativa", () => {
    const recommendation = inferRecommendationType({
      id: "1",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: false,
      answer: "no",
    });

    expect(recommendation).toBe("not_implemented");
  });

  it("gera partial_implementation para resposta parcial", () => {
    const recommendation = inferRecommendationType({
      id: "2",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: false,
      answer: "partial",
    });

    expect(recommendation).toBe("partial_implementation");
  });

  it("gera insufficient_evidence para resposta positiva com evidencia invalida", () => {
    const recommendation = inferRecommendationType({
      id: "3",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "invalid",
    });

    expect(recommendation).toBe("insufficient_evidence");
  });

  it("gera insufficient_evidence para resposta positiva com evidencia parcialmente valida", () => {
    const recommendation = inferRecommendationType({
      id: "4",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "partially_valid",
    });

    expect(recommendation).toBe("insufficient_evidence");
  });

  it("NAO gera missing_evidence para resposta positiva sem evidencia (cenario descontinuado)", () => {
    // Antes: retornava "missing_evidence". Agora: pendência de evidência é
    // tratada no fluxo de validação, não como recomendação.
    const semEvidencia = inferRecommendationType({
      id: "5",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
    });
    const pendente = inferRecommendationType({
      id: "6",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "pending",
    });
    const complementacao = inferRecommendationType({
      id: "7",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "complementation_requested",
    });

    expect(semEvidencia).toBeNull();
    expect(pendente).toBeNull();
    expect(complementacao).toBeNull();
  });

  it("retorna null para evidencia valida ou dispensada", () => {
    const valida = inferRecommendationType({
      id: "8",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "valid",
    });
    const dispensada = inferRecommendationType({
      id: "9",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: true,
      answer: "yes",
      validationStatus: "waived",
    });

    expect(valida).toBeNull();
    expect(dispensada).toBeNull();
  });

  it("retorna null para perguntas com FAMI desabilitado ou não aplicáveis", () => {
    const famiOff = inferRecommendationType({
      id: "10",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: false,
      requiresEvidence: false,
      answer: "no",
    });
    const naoAplicavel = inferRecommendationType({
      id: "11",
      axisId: "gov",
      sectionId: "s1",
      famiEnabled: true,
      requiresEvidence: false,
      answer: "no",
      isNotApplicable: true,
    });

    expect(famiOff).toBeNull();
    expect(naoAplicavel).toBeNull();
  });
});
