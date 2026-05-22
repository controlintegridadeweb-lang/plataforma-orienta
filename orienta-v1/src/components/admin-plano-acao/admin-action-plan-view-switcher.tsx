"use client";

import { SegmentedTabs } from "@/components/ui/segmented-tabs";

export type AdminPlanViewMode = "list" | "organization" | "status";

type Props = {
  value: AdminPlanViewMode;
  onChange: (next: AdminPlanViewMode) => void;
};

const OPTIONS: { value: AdminPlanViewMode; label: string }[] = [
  { value: "status", label: "Kanban" },
  { value: "list", label: "Lista" },
  { value: "organization", label: "Por organização" },
];

export function AdminActionPlanViewSwitcher({ value, onChange }: Props) {
  return (
    <SegmentedTabs<AdminPlanViewMode>
      aria-label="Modo de visualização"
      value={value}
      onChange={onChange}
      variant="bare"
      items={OPTIONS.map((o) => ({ id: o.value, label: o.label }))}
    />
  );
}
