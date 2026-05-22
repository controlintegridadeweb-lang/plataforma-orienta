import { z } from "zod";
import { recommendationStatusSchema } from "@/lib/recommendations/schemas";

export const planStatusSchema = z.enum([
  "to_implement",
  "in_progress",
  "completed",
  "cancelled",
]);

export type PlanStatus = z.infer<typeof planStatusSchema>;

/** Visoes de listagem (aba Métricas usa endpoint dedicado). */
export const actionPlanListViewSchema = z.enum([
  "overview",
  "backlog",
  "in_progress",
  "completed",
]);

export type ActionPlanListView = z.infer<typeof actionPlanListViewSchema>;

export const listActionPlansQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
  recommendationId: z.string().uuid().optional(),
  view: actionPlanListViewSchema.default("overview"),
  recommendationStatus: recommendationStatusSchema.optional(),
  planStatus: planStatusSchema.optional(),
  responsibleContains: z.string().trim().min(1).max(200).optional(),
  search: z.string().trim().min(1).max(500).optional(),
  dueFilter: z.enum(["all", "overdue", "due_7d"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const saveActionPlanSchema = z.object({
  planId: z.string().uuid().optional(),
  recommendationId: z.string().uuid(),
  formId: z.string().uuid(),
  actionText: z.string().min(5).max(4000),
  dueDate: z.string().min(8),
  responsibleSector: z.string().min(2).max(200),
  responsibleName: z.string().min(2).max(200),
  status: planStatusSchema,
  observations: z.string().max(4000).optional(),
});

export const actionPlanMetricsQuerySchema = z.object({
  formId: z.string().uuid().optional(),
  organizationId: z.string().uuid().optional(),
});

export const actionPlanByFormQuerySchema = z.object({
  organizationId: z.string().uuid(),
});

export type ListActionPlansQuery = z.infer<typeof listActionPlansQuerySchema>;
export type SaveActionPlanInput = z.infer<typeof saveActionPlanSchema>;

export const supervisionNoteTypeSchema = z.enum([
  "comment",
  "adjustment_request",
  "opinion",
  "approval",
  "pending",
  "forwarding",
]);

export type SupervisionNoteType = z.infer<typeof supervisionNoteTypeSchema>;

export const listSupervisionNotesQuerySchema = z.object({
  recommendationId: z.string().uuid(),
});

export const createSupervisionNoteSchema = z.object({
  recommendationId: z.string().uuid(),
  noteType: supervisionNoteTypeSchema,
  body: z.string().trim().min(1).max(4000),
});

export type CreateSupervisionNoteInput = z.infer<typeof createSupervisionNoteSchema>;
