import type { SupabaseClient } from "@supabase/supabase-js";
import { ActionPlansAdminService } from "@/lib/action-plans/admin-service";
import type { InlineLibraryAction, LibraryScenarioKey } from "@/lib/library/binding-types";
import { SnapshotService } from "@/lib/library/binding-service";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

export type SuggestedActionItem = {
  index: number;
  key: string;
  title: string;
  description: string | null;
  suggestedDeadlineDays: number;
  suggestedResponsibleArea: string | null;
  alreadyApplied: boolean;
};

export type SuggestedActionsPayload = {
  scenario: LibraryScenarioKey | null;
  suggestions: SuggestedActionItem[];
};

const DEFAULT_DEADLINE_DAYS = 30;
const DEFAULT_RESPONSIBLE = "A definir";

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function normalizeActionTextKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 200);
}

export function buildActionTextFromSuggestion(action: InlineLibraryAction): string {
  const title = action.title.trim();
  const desc = action.description?.trim();
  const combined = desc ? `${title}\n\n${desc}` : title;
  if (combined.length >= 5) return combined.slice(0, 4000);
  return `${title} — ação sugerida pelo formulário`.slice(0, 4000);
}

function inlineActionsForScenario(
  bindings: import("@/lib/library/binding-types").LibraryBindings | null | undefined,
  scenario: LibraryScenarioKey | null,
): InlineLibraryAction[] {
  if (!scenario || !bindings) return [];
  const slot = bindings[scenario];
  if (!slot?.actions?.length) return [];
  return slot.actions.filter((a) => a.title.trim().length > 0);
}

export class RecommendationSuggestedActionsService {
  private supabase: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.supabase = client ?? createSupabaseServiceRoleClient();
  }

  async listForRecommendation(recommendationId: string): Promise<SuggestedActionsPayload> {
    const { data: rec, error } = await this.supabase
      .from("recommendations")
      .select("id, form_id, question_id, scenario, forms!inner(version)")
      .eq("id", recommendationId)
      .maybeSingle();
    if (error) throw error;
    if (!rec) throw new Error("Recomendacao nao encontrada.");

    const form = Array.isArray(rec.forms) ? rec.forms[0] : rec.forms;
    const formVersion = Number((form as { version?: number })?.version ?? 1);
    const scenario = (rec.scenario as LibraryScenarioKey | null) ?? null;

    const snapshots = new SnapshotService(this.supabase);
    const snapshot = await snapshots.getSnapshotForQuestion(
      rec.form_id as string,
      formVersion,
      rec.question_id as string,
    );

    const inline = inlineActionsForScenario(snapshot?.bindings ?? null, scenario);

    const { data: existingPlans } = await this.supabase
      .from("action_plans")
      .select("action_text")
      .eq("recommendation_id", recommendationId);
    const appliedKeys = new Set(
      (existingPlans ?? []).map((p) => normalizeActionTextKey(String(p.action_text ?? ""))),
    );

    const suggestions: SuggestedActionItem[] = inline.map((action, index) => {
      const actionText = buildActionTextFromSuggestion(action);
      const key = normalizeActionTextKey(actionText);
      return {
        index,
        key,
        title: action.title.trim(),
        description: action.description?.trim() ?? null,
        suggestedDeadlineDays: action.suggestedDeadlineDays ?? DEFAULT_DEADLINE_DAYS,
        suggestedResponsibleArea: action.suggestedResponsibleArea?.trim() ?? null,
        alreadyApplied: appliedKeys.has(key),
      };
    });

    return { scenario, suggestions };
  }

  async applyIndices(
    recommendationId: string,
    indices: number[],
    caller: { role: "respondent"; organizationId: string },
  ): Promise<{ created: number; skipped: number }> {
    const payload = await this.listForRecommendation(recommendationId);

    const { data: rec, error: recErr } = await this.supabase
      .from("recommendations")
      .select("id, form_id, question_id, scenario, forms!inner(version)")
      .eq("id", recommendationId)
      .maybeSingle();
    if (recErr) throw recErr;
    if (!rec) throw new Error("Recomendacao nao encontrada.");

    const form = Array.isArray(rec.forms) ? rec.forms[0] : rec.forms;
    const formVersion = Number((form as { version?: number })?.version ?? 1);
    const scenario = (rec.scenario as LibraryScenarioKey | null) ?? null;
    const snapshots = new SnapshotService(this.supabase);
    const snapshot = await snapshots.getSnapshotForQuestion(
      rec.form_id as string,
      formVersion,
      rec.question_id as string,
    );
    const inline = inlineActionsForScenario(snapshot?.bindings ?? null, scenario);

    const plans = new ActionPlansAdminService(this.supabase);
    let created = 0;
    let skipped = 0;
    const appliedKeys = new Set<string>();

    for (const index of indices) {
      const item = payload.suggestions.find((s) => s.index === index);
      if (!item) {
        skipped += 1;
        continue;
      }
      if (item.alreadyApplied || appliedKeys.has(item.key)) {
        skipped += 1;
        continue;
      }
      const action = inline[item.index];
      if (!action) {
        skipped += 1;
        continue;
      }

      const actionText = buildActionTextFromSuggestion(action);
      const sectorRaw = action.suggestedResponsibleArea?.trim() ?? "";
      const sector = sectorRaw.length >= 2 ? sectorRaw : DEFAULT_RESPONSIBLE;

      await plans.save(
        {
          recommendationId,
          formId: rec.form_id as string,
          actionText,
          dueDate: addDaysIso(action.suggestedDeadlineDays ?? DEFAULT_DEADLINE_DAYS),
          responsibleSector: sector,
          responsibleName: DEFAULT_RESPONSIBLE,
          status: "to_implement",
        },
        caller,
      );
      appliedKeys.add(item.key);
      created += 1;
    }

    return { created, skipped };
  }
}
