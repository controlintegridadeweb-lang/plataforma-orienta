"use client";

import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationTable } from "./admin-recommendation-table";

type Props = {
  items: AdminRecommendationItem[];
};

export function AdminRecommendationList({ items }: Props) {
  return (
    <div aria-label="Tabela de recomendações">
      <AdminRecommendationTable items={items} />
    </div>
  );
}
