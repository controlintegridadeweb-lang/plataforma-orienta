import { describe, expect, it } from "vitest";
import {
  deriveRespondentStatus,
  overallStatus,
  respondentStatusNeedsAction,
  statusToKpiBucket,
} from "./respondent-status";
import type { EvidenceValidationEntry } from "./admin-service";

function entry(
  status: EvidenceValidationEntry["status"],
  iso = "2025-01-01T00:00:00.000Z",
): EvidenceValidationEntry {
  return {
    id: status + iso,
    status,
    justification: null,
    validatedBy: "u",
    validatedAt: iso,
  };
}

describe("deriveRespondentStatus", () => {
  it("pending sem historico vira aguardando_analise", () => {
    expect(deriveRespondentStatus("pending", [])).toBe("aguardando_analise");
  });
  it("pending com complementation no historico vira ajustada_e_reenviada", () => {
    expect(
      deriveRespondentStatus("pending", [entry("complementation_requested")]),
    ).toBe("ajustada_e_reenviada");
  });
  it("valid/waived viram aprovada", () => {
    expect(deriveRespondentStatus("valid", [])).toBe("aprovada");
    expect(deriveRespondentStatus("waived", [])).toBe("aprovada");
  });
  it("invalid/partially_valid viram reprovada", () => {
    expect(deriveRespondentStatus("invalid", [])).toBe("reprovada");
    expect(deriveRespondentStatus("partially_valid", [])).toBe("reprovada");
  });
  it("complementation_requested mantem como complementacao_solicitada", () => {
    expect(deriveRespondentStatus("complementation_requested", [])).toBe(
      "complementacao_solicitada",
    );
  });
});

describe("respondentStatusNeedsAction", () => {
  it("complementacao e reprovada exigem acao", () => {
    expect(respondentStatusNeedsAction("complementacao_solicitada")).toBe(true);
    expect(respondentStatusNeedsAction("reprovada")).toBe(true);
  });
  it("demais nao exigem acao", () => {
    expect(respondentStatusNeedsAction("aprovada")).toBe(false);
    expect(respondentStatusNeedsAction("aguardando_analise")).toBe(false);
    expect(respondentStatusNeedsAction("ajustada_e_reenviada")).toBe(false);
    expect(respondentStatusNeedsAction("enviada")).toBe(false);
  });
});

describe("statusToKpiBucket", () => {
  it("mapeia para os buckets corretos", () => {
    expect(statusToKpiBucket("aprovada")).toBe("aprovadas");
    expect(statusToKpiBucket("reprovada")).toBe("reprovadas");
    expect(statusToKpiBucket("complementacao_solicitada")).toBe("complementacao");
    expect(statusToKpiBucket("ajustada_e_reenviada")).toBe("aguardando");
    expect(statusToKpiBucket("aguardando_analise")).toBe("aguardando");
    expect(statusToKpiBucket("enviada")).toBe("aguardando");
  });
});

describe("overallStatus", () => {
  const zero = { enviadas: 0, aprovadas: 0, aguardando: 0, reprovadas: 0, complementacao: 0 };
  it("vazio -> nothing_sent", () => {
    expect(overallStatus(zero)).toBe("nothing_sent");
  });
  it("pendencia -> has_action_required", () => {
    expect(overallStatus({ ...zero, enviadas: 3, complementacao: 1, aguardando: 2 })).toBe(
      "has_action_required",
    );
  });
  it("tudo aprovado -> all_approved", () => {
    expect(overallStatus({ ...zero, enviadas: 4, aprovadas: 4 })).toBe(
      "all_approved",
    );
  });
  it("tudo em analise -> everything_under_review", () => {
    expect(overallStatus({ ...zero, enviadas: 3, aguardando: 3 })).toBe(
      "everything_under_review",
    );
  });
  it("misto -> mixed", () => {
    expect(overallStatus({ ...zero, enviadas: 5, aprovadas: 2, aguardando: 3 })).toBe(
      "mixed",
    );
  });
});
