import { describe, expect, it } from "vitest";
import { recommendationTypeLabel } from "./status-registry";

describe("recommendationTypeLabel", () => {
  it("traduz tipos canônicos", () => {
    expect(recommendationTypeLabel("not_implemented")).toBe("Não implementado");
    expect(recommendationTypeLabel("partial_implementation")).toBe("Implementação parcial");
    expect(recommendationTypeLabel("missing_evidence")).toBe("Ausência de evidência");
    expect(recommendationTypeLabel("insufficient_evidence")).toBe("Evidência insuficiente");
  });

  it("traduz chaves legadas do banco", () => {
    expect(recommendationTypeLabel("nao")).toBe("Não implementado");
    expect(recommendationTypeLabel("sim_sem_evidencia")).toBe("Sim, sem evidência");
  });

  it("retorna travessão para vazio", () => {
    expect(recommendationTypeLabel(null)).toBe("—");
    expect(recommendationTypeLabel("")).toBe("—");
  });

  it("usa Indefinido para chave desconhecida", () => {
    expect(recommendationTypeLabel("tipo_inexistente")).toBe("Indefinido");
  });
});
