import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase/auth-server", () => ({
  createSupabaseServerActionClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  }),
}));

import { POST } from "./route";

describe("POST /api/forms/transition", () => {
  it("retorna 401 sem autenticacao", async () => {
    const request = new Request("http://localhost/api/forms/transition", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: "draft", to: "submitted" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(401);
  });
});
