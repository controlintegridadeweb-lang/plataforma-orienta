import { z } from "zod";

/**
 * Estados operacionais do formulário (institucional) — espelha `WorkflowState`
 * em `src/lib/domain/types.ts` e o schema da rota `/api/operational/events`.
 */
export const operationalWorkflowStateSchema = z.enum([
  "draft",
  "submitted",
  "under_review",
  "complementation_requested",
  "resubmitted",
  "consolidated",
  "closed",
]);

export const operationalTransitionEventSchema = z.enum([
  "formal_submit",
  "validation_change",
  "authorized_reopen",
  "complementation_request",
]);

export type OperationalWorkflowState = z.infer<typeof operationalWorkflowStateSchema>;
export type OperationalTransitionEvent = z.infer<typeof operationalTransitionEventSchema>;

/**
 * Catálogo fino de eventos de domínio para timeline unificada / auditoria / SSOT de máquina de estados.
 * Estenda com payloads tipados por discriminated union conforme contratos de API forem fechados.
 *
 * Extensões sugeridas (payloads a definir junto ao backend):
 * - evidence.submitted / evidence.validation.updated / evidence.complementation.responded
 * - recommendation.created / recommendation.status.changed / recommendation.regenerated
 * - action_plan.created / action_plan.status.changed / action_plan.sla.breached
 * - fami.processing.started / fami.processing.completed / fami.snapshot.published
 * - report.generation.requested / report.generation.completed / report.superseded
 * - organization.member.invited / permissions.changed
 */
export const domainEventTypeSchema = z.enum([
  "operational.transition",
  "evidence.validation.changed",
  "recommendation.status.changed",
  "action_plan.status.changed",
  "fami.reprocess.requested",
  "report.generation.completed",
]);

export type DomainEventType = z.infer<typeof domainEventTypeSchema>;

export const domainEventEnvelopeSchema = z.object({
  id: z.string().uuid().optional(),
  type: domainEventTypeSchema,
  occurredAt: z.string().datetime().optional(),
  organizationId: z.string().uuid().optional(),
  actorUserId: z.string().uuid().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export type DomainEventEnvelope = z.infer<typeof domainEventEnvelopeSchema>;
