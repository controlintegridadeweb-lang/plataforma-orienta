import { NextResponse } from "next/server";
import { z } from "zod";
import { nextStateFromEvent, shouldReprocessFami } from "@/lib/domain/operational";
import { requireAuth } from "@/lib/api/auth";

const eventSchema = z.object({
  currentState: z.enum([
    "draft",
    "submitted",
    "under_review",
    "complementation_requested",
    "resubmitted",
    "consolidated",
    "closed",
  ]),
  event: z.enum([
    "formal_submit",
    "validation_change",
    "authorized_reopen",
    "adjustment_request",
  ]),
});

export async function POST(request: Request) {
  const { error } = await requireAuth(request, ["admin", "respondent"]);
  if (error) return error;

  const body = await request.json();
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const nextState = nextStateFromEvent(parsed.data.currentState, parsed.data.event);
  return NextResponse.json({
    nextState,
    reprocessFami: shouldReprocessFami(parsed.data.event),
  });
}
