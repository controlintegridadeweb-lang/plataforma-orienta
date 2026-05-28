import { describe, expect, it } from "vitest";
import { isGlobalAdmin, isOrgScopedCaller, isStaffCaller } from "./scope";

describe("isGlobalAdmin", () => {
  it("admin sem organizacao vinculada = global", () => {
    expect(isGlobalAdmin({ role: "admin", organizationId: null })).toBe(true);
  });

  it("admin com organizacao vinculada = NAO global (org-scoped)", () => {
    expect(isGlobalAdmin({ role: "admin", organizationId: "org-x" })).toBe(false);
  });

  it("respondent nunca e global", () => {
    expect(isGlobalAdmin({ role: "respondent", organizationId: "org-x" })).toBe(false);
  });
});

describe("isOrgScopedCaller", () => {
  it("inverso de isGlobalAdmin", () => {
    expect(isOrgScopedCaller({ role: "admin", organizationId: null })).toBe(false);
    expect(isOrgScopedCaller({ role: "admin", organizationId: "org-x" })).toBe(true);
    expect(isOrgScopedCaller({ role: "respondent", organizationId: "org-x" })).toBe(true);
  });
});

describe("isStaffCaller", () => {
  it("admin e staff (independente de org)", () => {
    expect(isStaffCaller({ role: "admin", organizationId: null })).toBe(true);
    expect(isStaffCaller({ role: "admin", organizationId: "org-x" })).toBe(true);
  });

  it("respondent nao e staff", () => {
    expect(isStaffCaller({ role: "respondent", organizationId: "org-x" })).toBe(false);
  });
});
