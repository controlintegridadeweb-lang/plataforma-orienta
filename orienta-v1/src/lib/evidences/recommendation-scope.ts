import type { EvidenceListItem } from "./admin-service";

type Scope = {
  questionId?: string | null;
  questionPrompt?: string | null;
};

/**
 * Evidências do escopo da recomendação: prioriza `questionId`; fallback em prompt exato.
 */
export function evidencesForRecommendationScope(
  items: EvidenceListItem[],
  scope: Scope,
): EvidenceListItem[] {
  const qid = scope.questionId?.trim();
  if (qid) {
    const byId = items.filter((e) => e.questionId === qid);
    if (byId.length > 0) return byId;
  }

  const prompt = scope.questionPrompt?.trim();
  if (prompt) {
    return items.filter((e) => e.questionPrompt.trim() === prompt);
  }

  return [];
}
