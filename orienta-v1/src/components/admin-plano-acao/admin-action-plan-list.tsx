"use client";

import type { AdminPlanItem } from "@/lib/action-plans/admin-monitoring";
import { AdminActionPlanCard } from "./admin-action-plan-card";

type Props = {
  items: AdminPlanItem[];
};

export function AdminActionPlanList({ items }: Props) {
  return (
    <ul
      className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      aria-label="Lista de planos de ação"
    >
      {items.map((it) => (
        <li key={it.rowKey}>
          <AdminActionPlanCard item={it} />
        </li>
      ))}
    </ul>
  );
}
