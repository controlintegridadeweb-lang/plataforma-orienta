"use client";

import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationStrategicCard } from "./admin-recommendation-strategic-card";

type Props = {
  item: AdminRecommendationItem;
  baseHref?: string;
};

export function AdminRecommendationCard({ item }: Props) {
  return <AdminRecommendationStrategicCard item={item} />;
}
