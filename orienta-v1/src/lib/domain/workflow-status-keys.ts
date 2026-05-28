/**
 * Chaves de visão derivada compartilhadas entre registry de status e libs de apresentação.
 * Mantidas aqui para evitar dependência circular status-registry ↔ admin-monitoring / admin-presentation.
 */

/** Monitoramento admin — planos de ação (`derivePlanView`). */
export type AdminPlanView =
  | "not_started"
  | "in_progress"
  | "awaiting_update"
  | "completed"
  | "overdue"
  | "critical";

/** Admin — recomendações (`deriveAdminRecommendationView`). */
export type AdminRecommendationView =
  | "open"
  | "awaiting_plan"
  | "plan_submitted"
  | "in_execution"
  | "overdue"
  | "in_review"
  | "completed"
  | "dismissed";

/** Respondente — recomendações (`deriveRespondentView`). */
export type RespondentRecommendationView =
  | "open"
  | "in_progress"
  | "awaiting_action"
  | "resolved"
  | "dismissed";

/** Respondente — plano de ação (`deriveActionPlanView`). */
export type ActionPlanView =
  | "not_started"
  | "in_progress"
  | "overdue"
  | "completed"
  | "paused"
  | "no_plan";
