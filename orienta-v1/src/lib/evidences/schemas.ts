import { z } from "zod";

/**
 * Schemas Zod para o fluxo de validacao de evidencias no admin. Enum alinhado
 * ao `validation_status` criado em `0001_orienta_v1.sql`.
 */

export const validationStatusSchema = z.enum([
  "pending",
  "valid",
  "invalid",
  "partially_valid",
  "complementation_requested",
  "waived",
]);

export type ValidationStatus = z.infer<typeof validationStatusSchema>;

export const validateEvidenceSchema = z
  .object({
    status: validationStatusSchema,
    justification: z.string().trim().max(2000).optional(),
  })
  .refine(
    (v) =>
      v.status !== "waived" ||
      (typeof v.justification === "string" && v.justification.length > 0),
    {
      path: ["justification"],
      message: "Justificativa obrigatoria para dispensa (waived).",
    },
  );

const uuidList = z
  .string()
  .optional()
  .transform((s) => {
    if (!s?.trim()) return undefined;
    const ids = s
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    return ids.length > 0 ? ids : undefined;
  })
  .pipe(
    z
      .array(z.string().uuid())
      .max(1000)
      .optional(),
  );

export const listEvidencesQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  status: validationStatusSchema.optional(),
  search: z.string().trim().min(1).max(200).optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  ids: uuidList,
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const evidenceExportFormatSchema = z.enum(["csv", "pdf"]);

export const evidenceExportQuerySchema = listEvidencesQuerySchema
  .omit({ limit: true, offset: true })
  .extend({
    format: evidenceExportFormatSchema,
  });

/** Mesmos filtros da lista, sem paginacao/status — usado em stats. */
export const evidenceStatsQuerySchema = listEvidencesQuerySchema.pick({
  formId: true,
  organizationId: true,
  search: true,
  from: true,
  to: true,
  ids: true,
});

/** Filtros para export (inclui status; sem paginacao). */
export const evidenceExportFiltersSchema = listEvidencesQuerySchema.omit({
  limit: true,
  offset: true,
});

export type ValidateEvidenceInput = z.infer<typeof validateEvidenceSchema>;
export type ListEvidencesQuery = z.infer<typeof listEvidencesQuerySchema>;
export type EvidenceExportFormat = z.infer<typeof evidenceExportFormatSchema>;
export type EvidenceStatsQuery = z.infer<typeof evidenceStatsQuerySchema>;
export type EvidenceExportFilters = z.infer<typeof evidenceExportFiltersSchema>;
