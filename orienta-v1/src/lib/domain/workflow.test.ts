import { describe, expect, it } from "vitest";
import { canTransition } from "./workflow";

describe("workflow transitions", () => {
  it("aceita transicoes validas", () => {
    expect(canTransition("draft", "submitted")).toBe(true);
    expect(canTransition("under_review", "consolidated")).toBe(true);
    expect(canTransition("closed", "draft")).toBe(true);
    expect(canTransition("submitted", "draft")).toBe(true);
  });

  it("rejeita transicoes invalidas", () => {
    expect(canTransition("draft", "closed")).toBe(false);
    expect(canTransition("submitted", "closed")).toBe(false);
  });
});
