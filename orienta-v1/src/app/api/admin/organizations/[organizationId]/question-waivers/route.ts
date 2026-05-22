import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/api/auth";
import { QuestionWaiverService } from "@/lib/forms/question-waiver-service";
import { triggerFamiReprocess } from "@/lib/fami/trigger-reprocess";
import { logError } from "@/lib/observability/logger";

type RouteContext = {
  params: Promise<{ organizationId: string }>;
};

const idSchema = z.string().uuid();

function parseUuid(value: string, label: string): NextResponse | string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success) {
    return NextResponse.json({ error: `${label} invalido.` }, { status: 400 });
  }
  return parsed.data;
}

const setWaiverSchema = z.object({
  questionId: z.string().uuid(),
  reason: z.string().trim().max(1000).optional().nullable(),
});

const clearWaiverSchema = z.object({
  questionId: z.string().uuid(),
});

async function reprocessFormsForQuestionWaiver(
  organizationId: string,
  questionId: string,
): Promise<Array<{ formId: string; result: Awaited<ReturnType<typeof triggerFamiReprocess>> }>> {
  const service = new QuestionWaiverService();
  const formIds = await service.listFormIdsContainingQuestion(questionId);
  const outcomes: Array<{
    formId: string;
    result: Awaited<ReturnType<typeof triggerFamiReprocess>>;
  }> = [];
  for (const formId of formIds) {
    const result = await triggerFamiReprocess(formId, organizationId, "waiver_changed");
    outcomes.push({ formId, result });
  }
  return outcomes;
}

export async function GET(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin", "analyst"]);
  if (authError) return authError;
  try {
    const { organizationId: rawOrg } = await context.params;
    const organizationId = parseUuid(rawOrg, "organizationId");
    if (organizationId instanceof NextResponse) return organizationId;

    const service = new QuestionWaiverService();
    const waivers = await service.listWaiversForOrg(organizationId);
    return NextResponse.json({ waivers });
  } catch (error) {
    logError("Failed to list waivers", error, {
      route: "/api/admin/organizations/:organizationId/question-waivers",
    });
    return NextResponse.json({ error: "Falha ao listar dispensas." }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const { context: authContext, error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { organizationId: rawOrg } = await context.params;
    const organizationId = parseUuid(rawOrg, "organizationId");
    if (organizationId instanceof NextResponse) return organizationId;

    const body = await request.json();
    const parsed = setWaiverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const service = new QuestionWaiverService();
    const waiver = await service.setWaiver({
      organizationId,
      questionId: parsed.data.questionId,
      reason: parsed.data.reason ?? null,
      waivedBy: authContext!.userId,
    });

    const famiReprocess = await reprocessFormsForQuestionWaiver(
      organizationId,
      parsed.data.questionId,
    );

    return NextResponse.json({ waiver, famiReprocess });
  } catch (error) {
    logError("Failed to set waiver", error, {
      route: "/api/admin/organizations/:organizationId/question-waivers",
    });
    return NextResponse.json({ error: "Falha ao criar dispensa." }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { error: authError } = await requireAuth(request, ["admin"]);
  if (authError) return authError;
  try {
    const { organizationId: rawOrg } = await context.params;
    const organizationId = parseUuid(rawOrg, "organizationId");
    if (organizationId instanceof NextResponse) return organizationId;

    const url = new URL(request.url);
    const questionIdParam = url.searchParams.get("questionId");
    const body = questionIdParam
      ? { questionId: questionIdParam }
      : await request.json().catch(() => ({}));
    const parsed = clearWaiverSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const service = new QuestionWaiverService();
    await service.clearWaiver({
      organizationId,
      questionId: parsed.data.questionId,
    });

    const famiReprocess = await reprocessFormsForQuestionWaiver(
      organizationId,
      parsed.data.questionId,
    );

    return NextResponse.json({ ok: true, famiReprocess });
  } catch (error) {
    logError("Failed to clear waiver", error, {
      route: "/api/admin/organizations/:organizationId/question-waivers",
    });
    return NextResponse.json({ error: "Falha ao remover dispensa." }, { status: 500 });
  }
}
