import { describe, expect, it } from "vitest";
import { deriveRespondentStatus } from "./answers-status";

describe("deriveRespondentStatus", () => {
  it("retorna nao_iniciada quando nao ha respostas", () => {
    expect(
      deriveRespondentStatus({
        answered: 0,
        total: 10,
        hasSubmission: false,
        hasComplementationRequested: false,
      }),
    ).toBe("nao_iniciada");
  });

  it("retorna em_preenchimento quando algumas perguntas foram respondidas", () => {
    expect(
      deriveRespondentStatus({
        answered: 3,
        total: 10,
        hasSubmission: false,
        hasComplementationRequested: false,
      }),
    ).toBe("em_preenchimento");
  });

  it("retorna completa quando todas as perguntas estao respondidas e nao houve submissao", () => {
    expect(
      deriveRespondentStatus({
        answered: 10,
        total: 10,
        hasSubmission: false,
        hasComplementationRequested: false,
      }),
    ).toBe("completa");
  });

  it("retorna submetida quando existe fami_results para o par", () => {
    expect(
      deriveRespondentStatus({
        answered: 10,
        total: 10,
        hasSubmission: true,
        hasComplementationRequested: false,
      }),
    ).toBe("submetida");
  });

  it("prioriza em_complementacao sobre qualquer outro estado", () => {
    expect(
      deriveRespondentStatus({
        answered: 10,
        total: 10,
        hasSubmission: true,
        hasComplementationRequested: true,
      }),
    ).toBe("em_complementacao");
  });

  it("trata total zero como nao_iniciada (formulario sem perguntas)", () => {
    expect(
      deriveRespondentStatus({
        answered: 0,
        total: 0,
        hasSubmission: false,
        hasComplementationRequested: false,
      }),
    ).toBe("nao_iniciada");
  });
});
