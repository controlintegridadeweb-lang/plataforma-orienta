import { z } from "zod";

/**
 * Schemas Zod para o fluxo de recomendacoes no admin. Status canonico
 * (`open`, `in_progress`, `resolved`, `dismissed`) foi normalizado em
 * `0012_recommendations_audit.sql`.
 */

export const recommendationStatusSchema = z.enum([
  "open",
  "in_progress",
  "resolved",
  "dismissed",
]);

export type RecommendationStatus = z.infer<typeof recommendationStatusSchema>;

export const listRecommendationsQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  /** Filtra recomendações cujas perguntas pertencem a seções deste eixo (`axes.id`). */
  axisId: z.string().uuid().optional(),
  /** Destaca uma recomendação específica (lista pode retornar só esta linha). */
  recommendationId: z.string().uuid().optional(),
  status: recommendationStatusSchema.optional(),
  type: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const updateRecommendationSchema = z
  .object({
    status: recommendationStatusSchema.optional(),
    currentText: z.string().trim().min(1).max(4000).optional(),
    comment: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) => v.status !== undefined || v.currentText !== undefined,
    { path: ["_"], message: "Informe pelo menos um campo para atualizar." },
  );

export const regenerateRecommendationsSchema = z.object({
  formId: z.string().uuid(),
  organizationId: z.string().uuid(),
});

export type ListRecommendationsQuery = z.infer<typeof listRecommendationsQuerySchema>;
export type UpdateRecommendationInput = z.infer<typeof updateRecommendationSchema>;
export type RegenerateRecommendationsInput = z.infer<
  typeof regenerateRecommendationsSchema
>;
