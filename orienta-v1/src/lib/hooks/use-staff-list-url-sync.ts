"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  buildStaffListSearchParams,
  type StaffListLayout,
  type StaffListUrlFilters,
} from "@/lib/staff-list-url";

type Options = {
  layout: StaffListLayout;
  filters: StaffListUrlFilters;
  debouncedSearch: string;
  includeAxis?: boolean;
};

/** Mantém filtros e modo de lista sincronizados com a query string (compartilhável entre módulos). */
export function useStaffListUrlSync({
  layout,
  filters,
  debouncedSearch,
  includeAxis = false,
}: Options): void {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const skipFirst = useRef(true);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false;
      return;
    }

    const next = buildStaffListSearchParams({
      layout,
      includeAxis,
      filters: { ...filters, search: debouncedSearch },
    });
    const current = searchParams.toString();
    const built = next.toString();
    if (built === current) return;

    const href = built ? `${pathname}?${built}` : pathname;
    router.replace(href, { scroll: false });
  }, [
    layout,
    filters.organizationId,
    filters.formId,
    filters.axisId,
    filters.status,
    filters.from,
    filters.to,
    debouncedSearch,
    includeAxis,
    pathname,
    router,
    searchParams,
  ]);
}
