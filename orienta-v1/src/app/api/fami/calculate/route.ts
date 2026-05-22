import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateFami } from "@/lib/domain/fami";
import { requireAuth } from "@/lib/api/auth";

const questionSchema = z.object({
  id: z.string(),
  axisId: z.string(),
  sectionId: z.string(),
  famiEnabled: z.boolean(),
  requiresEvidence: z.boolean(),
  answer: z.enum(["yes", "no", "partial"]),
  validationStatus: z
    .enum([
      "pending",
      "valid",
      "invalid",
      "partially_valid",
      "complementation_requested",
      "waived",
    ])
    .optional(),
  isNotApplicable: z.boolean().optional(),
});

export async function POST(request: Request) {
  const { error } = await requireAuth(request, ["analyst"]);
  if (error) return error;

  const body = await request.json();
  const parsed = z.array(questionSchema).safeParse(body.questions);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = calculateFami(parsed.data);
  return NextResponse.json(result);
}
