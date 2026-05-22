"use client";

import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type AdminRecommendationView = "list" | "organization" | "status";

type Props = {
  value: AdminRecommendationView;
  onChange: (next: AdminRecommendationView) => void;
};

const OPTIONS: { value: AdminRecommendationView; label: string }[] = [
  { value: "list", label: "Lista" },
  { value: "organization", label: "Por organização" },
  { value: "status", label: "Kanban" },
];

export function AdminRecommendationViewSwitcher({ value, onChange }: Props) {
  return (
    <SegmentedTabs<AdminRecommendationView>
      aria-label="Modo de visualização"
      value={value}
      onChange={onChange}
      items={OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
    />
  );
}
