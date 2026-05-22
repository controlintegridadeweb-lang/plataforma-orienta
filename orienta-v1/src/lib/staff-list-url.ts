/** Parâmetros de URL compartilhados entre listagens staff (Recomendações e Plano de Ação). */

export type StaffListLayout = "list" | "organization";

export type StaffListUrlFilters = {
  search: string;
  organizationId: string;
  formId: string;
  axisId: string;
  status: string;
  from: string;
  to: string;
};

export const emptyStaffListUrlFilters: StaffListUrlFilters = {
  search: "",
  organizationId: "",
  formId: "",
  axisId: "",
  status: "",
  from: "",
  to: "",
};

export function parseStaffListLayout(
  params: URLSearchParams,
  legacyViewKey = "view",
): StaffListLayout {
  const layout = params.get("layout");
  if (layout === "organization") return "organization";
  if (layout === "list") return "list";
  const legacy = params.get(legacyViewKey);
  if (legacy === "organization") return "organization";
  return "list";
}

export function parseStaffListUrlFilters(
  params: URLSearchParams,
  opts: { includeAxis?: boolean } = {},
): Partial<StaffListUrlFilters> {
  const partial: Partial<StaffListUrlFilters> = {
    search: params.get("q") ?? undefined,
    organizationId: params.get("organizationId") ?? undefined,
    formId: params.get("formId") ?? undefined,
    status: params.get("status") ?? undefined,
    from: params.get("from") ?? undefined,
    to: params.get("to") ?? undefined,
  };
  if (opts.includeAxis) {
    const axisId = params.get("axisId");
    if (axisId != null) partial.axisId = axisId;
  }
  return partial;
}

export function buildStaffListSearchParams(input: {
  layout: StaffListLayout;
  filters: StaffListUrlFilters;
  includeAxis?: boolean;
}): URLSearchParams {
  const { layout, filters, includeAxis } = input;
  const params = new URLSearchParams();
  params.set("layout", layout);
  if (filters.search.trim()) params.set("q", filters.search.trim());
  if (filters.organizationId) params.set("organizationId", filters.organizationId);
  if (filters.formId) params.set("formId", filters.formId);
  if (includeAxis && filters.axisId) params.set("axisId", filters.axisId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  return params;
}
