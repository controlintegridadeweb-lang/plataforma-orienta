import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type Client = SupabaseClient;

export type QuestionWaiver = {
  organizationId: string;
  questionId: string;
  reason: string | null;
  waivedBy: string;
  waivedAt: string;
};

export type SetWaiverInput = {
  organizationId: string;
  questionId: string;
  reason?: string | null;
  waivedBy: string;
};

/**
 * Dispensa institucional por par (pergunta, organização). Independente de
 * formulário — vale em qualquer form que inclua a pergunta.
 */
export class QuestionWaiverService {
  private supabase: Client;

  constructor(client?: Client) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async setWaiver(input: SetWaiverInput): Promise<QuestionWaiver> {
    const { data, error } = await this.supabase
      .from("question_organization_waivers")
      .upsert(
        {
          organization_id: input.organizationId,
          question_id: input.questionId,
          reason: input.reason?.trim() || null,
          waived_by: input.waivedBy,
          waived_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,question_id" },
      )
      .select("organization_id,question_id,reason,waived_by,waived_at")
      .single();
    if (error) throw error;
    return mapWaiverRow(data);
  }

  async clearWaiver(input: {
    organizationId: string;
    questionId: string;
  }): Promise<void> {
    const { error } = await this.supabase
      .from("question_organization_waivers")
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("question_id", input.questionId);
    if (error) throw error;
  }

  async listWaiversForOrg(organizationId: string): Promise<QuestionWaiver[]> {
    const { data, error } = await this.supabase
      .from("question_organization_waivers")
      .select("organization_id,question_id,reason,waived_by,waived_at")
      .eq("organization_id", organizationId);
    if (error) throw error;
    return (data ?? []).map(mapWaiverRow);
  }

  async listWaivedQuestionIdsForOrg(organizationId: string): Promise<Set<string>> {
    const rows = await this.listWaiversForOrg(organizationId);
    return new Set(rows.map((r) => r.questionId));
  }

  /** Formulários que contêm a pergunta (para reprocessar recomendações). */
  async listFormIdsContainingQuestion(questionId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from("form_questions")
      .select("form_id")
      .eq("question_id", questionId);
    if (error) throw error;
    return [...new Set((data ?? []).map((row) => row.form_id as string).filter(Boolean))];
  }
}

function mapWaiverRow(row: unknown): QuestionWaiver {
  const r = row as Record<string, unknown>;
  return {
    organizationId: String(r.organization_id ?? ""),
    questionId: String(r.question_id ?? ""),
    reason: (r.reason as string | null) ?? null,
    waivedBy: String(r.waived_by ?? ""),
    waivedAt: String(r.waived_at ?? ""),
  };
}
