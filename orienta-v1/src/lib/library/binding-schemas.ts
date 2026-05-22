import { z } from "zod";
import { LIBRARY_SCENARIOS } from "./binding-types";

const uuid = z.string().uuid();
const SHORT_TEXT_MAX = 500;

const longText = z
  .string()
  .trim()
  .max(4000)
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null))
  .nullable();

const inlineRecommendationSchema = z
  .object({
    title: z.string().trim().min(1).max(SHORT_TEXT_MAX),
    description: longText,
    textoBaseFixo: longText,
    textoBaseParametrizavel: longText,
    tipo: z
      .enum([
        "nao_implementacao",
        "implementacao_parcial",
        "ausencia_evidencia",
        "evidencia_insuficiente",
      ])
      .nullable()
      .optional(),
    fundamentoTecnico: longText,
    escopoAplicacao: longText,
  })
  .optional()
  .nullable();

const inlineActionSchema = z.object({
  title: z.string().trim().min(1).max(SHORT_TEXT_MAX),
  description: longText,
  suggestedDeadlineDays: z.number().int().min(1).max(3650).nullable().optional(),
  suggestedResponsibleArea: longText,
  fundamentoTecnico: longText,
  criterioConclusao: longText,
});

const scenarioBindingSchema = z.object({
  recommendationId: uuid.nullable(),
  actionIds: z.array(uuid).max(20),
  recommendation: inlineRecommendationSchema,
  actions: z.array(inlineActionSchema).max(20).optional(),
  note: z.string().trim().max(2000).optional().nullable(),
});

const bindingsShape = Object.fromEntries(
  LIBRARY_SCENARIOS.map((key) => [key, scenarioBindingSchema.optional()]),
) as unknown as z.ZodRawShape;

export const libraryBindingsSchema = z.object(bindingsShape).partial();

const scaleBandsSchema = z
  .object({
    failMax: z.number().min(1).max(5),
    partialMax: z.number().min(1).max(5),
  })
  .refine((v) => v.failMax < v.partialMax, {
    message: "failMax deve ser menor que partialMax",
  });

const numericThresholdsSchema = z
  .object({
    failBelow: z.number(),
    partialBelow: z.number(),
  })
  .refine((v) => v.failBelow < v.partialBelow, {
    message: "failBelow deve ser menor que partialBelow",
  });

export const responseMappingSchema = z.object({
  scaleBands: scaleBandsSchema.nullable().optional(),
  numericThresholds: numericThresholdsSchema.nullable().optional(),
});

/**
 * Schema "forte" da metrica inline (todos os campos obrigatorios). Utilizado
 * quando precisamos garantir metrica completa (ex.: normalizacao de snapshots
 * antigos ou validacao de leitura).
 */
export const inlineMetricSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: longText,
  answerType: z.enum(["yes_no", "scale", "numeric", "text"]),
  interpretation: z.enum(["higher_better", "lower_better", "qualitative"]),
});

/**
 * Schema relaxado usado na entrada de `PUT /binding`: a UI simplificada envia
 * apenas `answerType`. Nome, descricao, interpretacao e severidade sao
 * preenchidos por defaults derivados (nome = enunciado da pergunta;
 * interpretacao = qualitative para tipos categoricos, higher_better para
 * scale/numeric).
 */
export const inlineMetricInputSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  description: longText,
  answerType: z.enum(["yes_no", "scale", "numeric", "text"]),
  interpretation: z
    .enum(["higher_better", "lower_better", "qualitative"])
    .optional(),
});

export const questionBindingInputSchema = z.object({
  axisId: uuid,
  sectionId: uuid,
  /** @deprecated Legado; use `metric` inline. Mantido para compat. */
  metricId: uuid.nullable().optional(),
  metric: inlineMetricInputSchema.nullable().default(null),
  bindings: libraryBindingsSchema.default({}),
  responseMapping: responseMappingSchema.default({}),
});

export type QuestionBindingInput = z.infer<typeof questionBindingInputSchema>;
