import type { RespondentRecommendationItem } from "@/lib/recommendations/respondent-presentation";

export function firstLineRecommendation(text: string): string {
  const line = text.split(/\n+/)[0]?.trim() ?? "";
  if (!line) return "Recomendação";
  return line.length > 180 ? `${line.slice(0, 177)}…` : line;
}

export function formatRecommendationDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Linha de contexto secundário (formulário, eixo, seção). */
export function recommendationContextMeta(item: RespondentRecommendationItem): string {
  const parts = [item.formName, item.axisName, item.sectionName].filter(
    (p) => p && p.trim().length > 0,
  );
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function planLinkSummary(item: RespondentRecommendationItem): {
  label: string;
  tone: "muted" | "ok" | "warn";
} {
  if (!item.hasPlan) {
    return { label: "Aguardando ação", tone: "warn" };
  }
  const count = item.actionCount;
  return {
    label: count === 1 ? "1 ação" : `${count} ações`,
    tone: "ok",
  };
}
