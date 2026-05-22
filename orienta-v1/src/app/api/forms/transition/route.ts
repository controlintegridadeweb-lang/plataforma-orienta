import { NextResponse } from "next/server";
import { z } from "zod";
import { canTransition } from "@/lib/domain/workflow";
import { requireAuth } from "@/lib/api/auth";

const transitionSchema = z.object({
  from: z.enum([
    "draft",
    "submitted",
    "under_review",
    "complementation_requested",
    "resubmitted",
    "consolidated",
    "closed",
  ]),
  to: z.enum([
    "draft",
    "submitted",
    "under_review",
    "complementation_requested",
    "resubmitted",
    "consolidated",
    "closed",
  ]),
});

export async function POST(request: Request) {
  const { error } = await requireAuth(request, ["admin", "analyst"]);
  if (error) return error;

  const body = await request.json();
  const parsed = transitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json({
    allowed: canTransition(parsed.data.from, parsed.data.to),
  });
}
