import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logInfo } from "@/lib/observability/logger";
import { LibraryValidationError } from "./service";

export type RecommendationExceptionStatus =
  | "requested"
  | "approved"
  | "rejected"
  | "expired";

export type RecommendationException = {
  id: string;
  organizationId: string;
  recommendationId: string;
  questionId: string | null;
  motivo: string;
  prazo: string | null;
  status: RecommendationExceptionStatus;
  requestedBy: string | null;
  requestedAt: string;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: string;
  organization_id: string;
  recommendation_id: string;
  question_id: string | null;
  motivo: string;
  prazo: string | null;
  status: RecommendationExceptionStatus;
  requested_by: string | null;
  requested_at: string;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
};

function mapRow(row: Row): RecommendationException {
  return {
    id: row.id,
    organizationId: row.organization_id,
    recommendationId: row.recommendation_id,
    questionId: row.question_id,
    motivo: row.motivo,
    prazo: row.prazo,
    status: row.status,
    requestedBy: row.requested_by,
    requestedAt: row.requested_at,
    decidedBy: row.decided_by,
    decidedAt: row.decided_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const exceptionRequestSchema = z.object({
  organizationId: z.string().uuid(),
  recommendationId: z.string().uuid(),
  questionId: z.string().uuid().optional().nullable(),
  motivo: z.string().trim().min(20, "Motivo deve ter pelo menos 20 caracteres."),
  prazo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Prazo em formato YYYY-MM-DD.").optional().nullable(),
});

export const exceptionDecisionSchema = z.object({
  status: z.enum(["approved", "rejected"]),
  motivo: z.string().trim().max(2000).optional().nullable(),
});

export class ExceptionsService {
  private supabase: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async request(
    payload: unknown,
    actor: { userId?: string | null },
  ): Promise<RecommendationException> {
    const parsed = exceptionRequestSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LibraryValidationError(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "_",
          message: issue.message,
        })),
      );
    }
    const { data, error } = await this.supabase
      .from("recommendation_exceptions")
      .insert({
        organization_id: parsed.data.organizationId,
        recommendation_id: parsed.data.recommendationId,
        question_id: parsed.data.questionId ?? null,
        motivo: parsed.data.motivo,
        prazo: parsed.data.prazo ?? null,
        status: "requested",
        requested_by: actor.userId ?? null,
      })
      .select("*")
      .single();
    if (error) throw error;
    logInfo("library.exception.requested", {
      recommendationId: parsed.data.recommendationId,
      organizationId: parsed.data.organizationId,
    });
    return mapRow(data as Row);
  }

  async decide(
    id: string,
    payload: unknown,
    actor: { userId?: string | null },
  ): Promise<RecommendationException> {
    const parsed = exceptionDecisionSchema.safeParse(payload);
    if (!parsed.success) {
      throw new LibraryValidationError(
        parsed.error.issues.map((issue) => ({
          path: issue.path.join(".") || "_",
          message: issue.message,
        })),
      );
    }
    const decidedAt = new Date().toISOString();
    const { data, error } = await this.supabase
      .from("recommendation_exceptions")
      .update({
        status: parsed.data.status,
        decided_by: actor.userId ?? null,
        decided_at: decidedAt,
      })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    logInfo("library.exception.decided", {
      id,
      status: parsed.data.status,
      actorUserId: actor.userId ?? null,
    });
    return mapRow(data as Row);
  }

  async listByOrg(organizationId: string): Promise<RecommendationException[]> {
    const { data, error } = await this.supabase
      .from("recommendation_exceptions")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as Row));
  }
}
