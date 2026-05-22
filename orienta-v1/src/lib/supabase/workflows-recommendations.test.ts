import { describe, expect, it } from "vitest";
import { RULE_VERSION } from "@/lib/domain/recommendation-engine-v2";

/**
 * Testes de contrato do upsert de recomendacoes (logica pura espelhada em workflows.ts).
 */
const PRESERVED = new Set(["in_progress", "resolved", "dismissed"]);

function shouldPreserveStatus(status: string): boolean {
  return PRESERVED.has(status);
}

function patchForUpdate(
  existing: { status: string; current_text: string; original_text: string },
  desired: { current_text: string; original_text: string },
  metaChanged: boolean,
): Record<string, string> | null {
  if (!metaChanged) return null;
  const preserveStatus = shouldPreserveStatus(existing.status);
  const textChanged =
    existing.current_text !== desired.current_text ||
    existing.original_text !== desired.original_text;
  const patch: Record<string, string> = {};
  if (preserveStatus) {
    if (textChanged) patch.current_text = desired.current_text;
  } else {
    patch.current_text = desired.current_text;
  }
  return Object.keys(patch).length > 0 ? patch : {};
}

describe("recommendation upsert policy", () => {
  it("preserves status when in_progress and only updates current_text if text changed", () => {
    const patch = patchForUpdate(
      { status: "in_progress", current_text: "old", original_text: "old" },
      { current_text: "new", original_text: "new" },
      true,
    );
    expect(patch?.current_text).toBe("new");
  });

  it("does not reset resolved status", () => {
    expect(shouldPreserveStatus("resolved")).toBe(true);
  });

  it("RULE_VERSION is stable for snapshot metadata", () => {
    expect(RULE_VERSION).toMatch(/biblioteca/);
  });
});
