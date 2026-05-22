import { describe, expect, it, vi } from "vitest";
import { ensureStructuralAxesCatalog, STRUCTURAL_AXIS_NAMES } from "./structural-catalog";

describe("ensureStructuralAxesCatalog", () => {
  it("faz upsert dos tres eixos estruturais", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const supabase = {
      from: vi.fn().mockReturnValue({ upsert }),
    };

    await ensureStructuralAxesCatalog(supabase as never);

    expect(supabase.from).toHaveBeenCalledWith("axes");
    expect(upsert).toHaveBeenCalledWith(
      STRUCTURAL_AXIS_NAMES.map((name) => ({ name })),
      { onConflict: "name" },
    );
  });
});
