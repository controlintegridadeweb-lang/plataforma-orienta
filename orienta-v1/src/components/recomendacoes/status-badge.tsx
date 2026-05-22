"use client";

import { WorkflowStatusBadge } from "@/components/workflow/workflow-status-badge";
import { RECOMMENDATION_TABLE_REGISTRY } from "@/lib/domain/status-registry";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";

export const STATUS_LABELS: Record<RecommendationStatus, string> = Object.fromEntries(
  (Object.keys(RECOMMENDATION_TABLE_REGISTRY) as RecommendationStatus[]).map((k) => [
    k,
    RECOMMENDATION_TABLE_REGISTRY[k].label,
  ]),
) as Record<RecommendationStatus, string>;

export function StatusBadge({ status }: { status: RecommendationStatus }) {
  return (
    <WorkflowStatusBadge domain="recommendation_table" status={status} presentation="chip" />
  );
}
