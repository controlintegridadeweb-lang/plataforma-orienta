"use client";

import { formSurface } from "@/lib/layout/form-surface";
import { Skeleton, TableSkeleton } from "@/components/ui/loading";

export function EvidencesKpiSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className={formSurface.card}>
          <div className="px-4 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-8 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function EvidencesTableSkeleton() {
  return (
    <div className={formSurface.table.wrapper}>
      <TableSkeleton rows={5} cols={6} className="p-4" />
    </div>
  );
}
