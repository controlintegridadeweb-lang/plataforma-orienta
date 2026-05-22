import { describe, expect, it, vi, afterEach } from "vitest";
import { resolveAppOrigin } from "./app-url";

describe("resolveAppOrigin", () => {
  const env = process.env;

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllEnvs();
  });

  it("prefere Origin do request", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://prod.example.com");
    expect(resolveAppOrigin("https://preview.vercel.app")).toBe("https://preview.vercel.app");
  });

  it("usa NEXT_PUBLIC_APP_URL quando nao ha Origin", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://prod.example.com/");
    expect(resolveAppOrigin(null)).toBe("https://prod.example.com");
  });

  it("usa VERCEL_URL como fallback", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "orienta-git-staging-team.vercel.app");
    expect(resolveAppOrigin(undefined)).toBe("https://orienta-git-staging-team.vercel.app");
  });

  it("cai em localhost sem configuracao", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("VERCEL_URL", "");
    expect(resolveAppOrigin(null)).toBe("http://localhost:3000");
  });
});
