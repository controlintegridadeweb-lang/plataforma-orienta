"use client";

import { statusPillBase } from "@/components/ui/status-pill";
import { recommendationTypeEntry } from "@/lib/domain/status-registry";

type Props = {
  type: string;
  className?: string;
  /** Mantido por compatibilidade — visual único discreto. */
  presentation?: "pill" | "chip";
};

/** Badge para `recommendations.recommendation_type` com rótulo em português. */
export function RecommendationTypeBadge({ type, className = "" }: Props) {
  const meta = recommendationTypeEntry(type);

  return (
    <span
      className={`${statusPillBase} ${meta.chipColorClass ?? meta.colorClass} ${className}`.trim()}
      title={meta.description ?? meta.label}
    >
      {meta.label}
    </span>
  );
}
