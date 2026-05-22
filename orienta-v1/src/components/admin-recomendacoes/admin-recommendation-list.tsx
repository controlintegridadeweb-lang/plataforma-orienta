"use client";

import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationCard } from "./admin-recommendation-card";

type Props = {
  items: AdminRecommendationItem[];
};

export function AdminRecommendationList({ items }: Props) {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3"
      aria-label="Lista de recomendações"
    >
      {items.map((it) => (
        <li key={it.recommendationId}>
          <AdminRecommendationCard item={it} />
        </li>
      ))}
    </ul>
  );
}
