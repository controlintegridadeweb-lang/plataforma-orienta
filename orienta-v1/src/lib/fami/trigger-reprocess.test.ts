import { describe, expect, it, vi, beforeEach } from "vitest";

const reprocessMock = vi.fn();
const logInfoMock = vi.fn();
const logErrorMock = vi.fn();
const fromMock = vi.fn();

vi.mock("@/lib/supabase/workflows", () => ({
  reprocessFormForOrganization: (...args: unknown[]) => reprocessMock(...args),
}));

vi.mock("@/lib/observability/logger", () => ({
  logInfo: (...args: unknown[]) => logInfoMock(...args),
  logError: (...args: unknown[]) => logErrorMock(...args),
}));

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServiceRoleClient: () => ({
    from: fromMock,
  }),
}));

describe("triggerFamiReprocess", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reprocessMock.mockResolvedValue({
      processingVersion: 2,
      recommendationsCreated: 3,
      fami: {},
    });
  });

  it("retorna resultado quando reprocessamento ok", async () => {
    const { triggerFamiReprocess } = await import("./trigger-reprocess");
    const result = await triggerFamiReprocess(
      "f1",
      "o1",
      "response_saved",
    );
    expect(result).toEqual({
      processingVersion: 2,
      recommendationsCreated: 3,
      famiComputed: false,
    });
    expect(reprocessMock).toHaveBeenCalledWith("f1", "o1", {
      mode: "open",
      computeFami: false,
    });
  });

  it("nao propaga erro por padrao", async () => {
    reprocessMock.mockRejectedValue(new Error("fail"));
    const { triggerFamiReprocess } = await import("./trigger-reprocess");
    const result = await triggerFamiReprocess("f1", "o1", "evidence_validated");
    expect(result).toBeNull();
    expect(logErrorMock).toHaveBeenCalled();
  });
});
