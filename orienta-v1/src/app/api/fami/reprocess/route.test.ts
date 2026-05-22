import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseServerActionClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}));

import { POST } from "./route";

describe("POST /api/fami/reprocess", () => {
  it("retorna 401 sem autenticacao", async () => {
    const request = new Request("http://localhost/api/fami/reprocess", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        formId: "5fd07e6d-a83a-432d-93f6-922f0d7c7485",
        organizationId: "ddb50ed9-8ce5-4453-990f-d18d5c5d3900",
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
