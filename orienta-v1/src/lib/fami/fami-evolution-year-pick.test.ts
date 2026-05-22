import { describe, expect, it } from "vitest";
import {
  pickBestGlobalPerBrtYear,
  type GlobalFamiRowLite,
} from "./fami-evolution-year-pick";

function row(pv: number, iso: string, pct = 10, lvl = 1): GlobalFamiRowLite {
  return {
    processingVersion: pv,
    createdAt: iso,
    percentage: pct,
    maturityLevel: lvl,
  };
}

describe("pickBestGlobalPerBrtYear", () => {
  it("prefere maior processing_version no mesmo ano", () => {
    const out = pickBestGlobalPerBrtYear([
      row(1, "2024-06-01T12:00:00.000Z", 40),
      row(3, "2024-09-01T12:00:00.000Z", 55),
      row(2, "2024-08-01T12:00:00.000Z", 50),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.processingVersion).toBe(3);
    expect(out[0]!.percentage).toBe(55);
  });

  it("mantem dois anos distintos", () => {
    const out = pickBestGlobalPerBrtYear([
      row(5, "2024-06-01T12:00:00.000Z"),
      row(10, "2025-03-01T12:00:00.000Z"),
    ]);
    expect(out.map((r) => r.processingVersion)).toEqual([5, 10]);
  });

  it("empate de versao usa created_at mais recente", () => {
    const out = pickBestGlobalPerBrtYear([
      row(2, "2024-06-01T15:00:00.000Z", 41),
      row(2, "2024-11-02T18:00:00.000Z", 42),
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]!.createdAt).toBe("2024-11-02T18:00:00.000Z");
    expect(out[0]!.percentage).toBe(42);
  });

  it("lista vazia", () => {
    expect(pickBestGlobalPerBrtYear([])).toEqual([]);
  });
});
