import { NextResponse } from "next/server";
import { z } from "zod";
import { inferRecommendationType } from "@/lib/domain/recommendation-engine";
import {
  buildRecommendationFromSnapshot,
  resolveScenario,
  type ScenarioInput,
} from "@/lib/domain/recommendation-engine-v2";
import { SnapshotService } from "@/lib/library/binding-service";
import { mapMetricValueToAnswer } from "@/lib/library/metric-response-mapper";
import type { InlineMetric } from "@/lib/library/binding-types";
import { requireAuth } from "@/lib/api/auth";
import { logError } from "@/lib/observability/logger";

const legacyPayload = z.object({
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

const v2Payload = z.object({
  useSnapshot: z.literal(true),
  formId: z.string().uuid(),
  formVersion: z.number().int().positive(),
  questionId: z.string().uuid(),
  answer: z.enum(["yes", "no", "partial"]).optional(),
  requiresEvidence: z.boolean(),
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
  isInReview: z.boolean().optional(),
  isInProgress: z.boolean().optional(),
  isOutOfScope: z.boolean().optional(),
  hasEvidenceSubmitted: z.boolean().optional(),
  answeredUnknown: z.boolean().optional(),
  /** Metrica de texto livre: cenario definido pelo analista via validationStatus. */
  isFreeTextAnswer: z.boolean().optional(),
  /** Valor numerico (1..5) para metricas com answerType = "scale". */
  scaleValue: z.number().min(1).max(5).optional(),
  /** Valor bruto para metricas com answerType = "numeric". */
  numericValue: z.number().optional(),
  parameters: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).optional(),
});

type MetricMeta = Pick<InlineMetric, "answerType" | "interpretation"> | null;

export async function POST(request: Request) {
  const { error: authError } = await requireAuth(request, ["analyst"]);
  if (authError) return authError;

  const body = await request.json();

  if ((body as { useSnapshot?: unknown })?.useSnapshot === true) {
    const parsed = v2Payload.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    try {
      const snapshots = new SnapshotService();
      const snapshot = await snapshots.getSnapshotForQuestion(
        parsed.data.formId,
        parsed.data.formVersion,
        parsed.data.questionId,
      );
      if (!snapshot) {
        return NextResponse.json(
          { error: "Snapshot nao encontrado para este formulario/pergunta." },
          { status: 404 },
        );
      }

      const metricMeta: MetricMeta = snapshot.metric
        ? {
            answerType: snapshot.metric.answerType,
            interpretation: snapshot.metric.interpretation,
          }
        : null;

      const requiresTypedValue =
        metricMeta?.answerType === "scale" || metricMeta?.answerType === "numeric";

      let mappedAnswer: "yes" | "no" | "partial" | undefined = parsed.data.answer;
      if (requiresTypedValue && metricMeta) {
        const mapped = mapMetricValueToAnswer({
          answerType: metricMeta.answerType,
          interpretation: metricMeta.interpretation,
          scaleValue: parsed.data.scaleValue,
          numericValue: parsed.data.numericValue,
          mapping: snapshot.responseMapping ?? null,
        });
        if (mapped.kind === "mapped") {
          mappedAnswer = mapped.answer;
        } else if (!mappedAnswer) {
          return NextResponse.json(
            {
              error: `Nao foi possivel mapear resposta para a metrica: ${mapped.reason}`,
            },
            { status: 400 },
          );
        }
      }

      if (!mappedAnswer) {
        return NextResponse.json(
          { error: "answer ou scaleValue/numericValue obrigatorios." },
          { status: 400 },
        );
      }

      const scenarioInput: ScenarioInput = {
        answer: mappedAnswer,
        requiresEvidence: parsed.data.requiresEvidence,
        validationStatus: parsed.data.validationStatus,
        isNotApplicable: parsed.data.isNotApplicable,
        isInReview: parsed.data.isInReview,
        isInProgress: parsed.data.isInProgress,
        isOutOfScope: parsed.data.isOutOfScope,
        hasEvidenceSubmitted: parsed.data.hasEvidenceSubmitted,
        answeredUnknown: parsed.data.answeredUnknown,
        isFreeTextAnswer: parsed.data.isFreeTextAnswer ?? false,
      };

      const recommendation = buildRecommendationFromSnapshot({
        snapshot,
        input: scenarioInput,
        parameters: parsed.data.parameters ?? {},
      });
      return NextResponse.json({
        scenario: resolveScenario(scenarioInput).scenario,
        mappedAnswer,
        recommendation,
      });
    } catch (err) {
      logError("Failed to build recommendation from snapshot", err, {
        route: "/api/recommendations/infer",
      });
      return NextResponse.json({ error: "Falha ao inferir recomendacao." }, { status: 500 });
    }
  }

  const parsed = legacyPayload.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  return NextResponse.json({
    recommendationType: inferRecommendationType(parsed.data),
  });
}
