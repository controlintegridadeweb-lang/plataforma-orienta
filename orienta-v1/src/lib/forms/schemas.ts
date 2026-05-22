import { z } from "zod";

/**
 * Schemas Zod para o CRUD admin de formularios e perguntas. Centraliza
 * validacoes usadas pelas rotas e pelos testes do service.
 */

export const createFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(200),
});

export const renameFormSchema = z.object({
  name: z.string().trim().min(1, "Informe um nome.").max(200),
});

export const archiveFormSchema = z.object({
  archived: z.boolean(),
});

export const setDeadlineSchema = z.object({
  responseDeadlineAt: z.string().datetime().nullable(),
});

export const createQuestionSchema = z.object({
  prompt: z.string().trim().min(1, "Informe o enunciado.").max(500),
  requiresEvidence: z.boolean().default(false),
});

export const updateQuestionSchema = z
  .object({
    prompt: z.string().trim().min(1).max(500).optional(),
    requiresEvidence: z.boolean().optional(),
  })
  .refine(
    (v) => v.prompt !== undefined || v.requiresEvidence !== undefined,
    { message: "Informe pelo menos um campo para atualizar." },
  );

export const reorderSchema = z.object({
  orderedQuestionIds: z.array(z.string().uuid()).min(1),
});

export type CreateFormInput = z.infer<typeof createFormSchema>;
export type RenameFormInput = z.infer<typeof renameFormSchema>;
export type ArchiveFormInput = z.infer<typeof archiveFormSchema>;
export type SetDeadlineInput = z.infer<typeof setDeadlineSchema>;
export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type ReorderInput = z.infer<typeof reorderSchema>;
