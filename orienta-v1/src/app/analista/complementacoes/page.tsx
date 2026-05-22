import { redirect } from "next/navigation";

import { firstSearchParam } from "@/lib/admin/search-params";

/** Rota legada → canônica com filtro de complementação. */
export default async function AnalistaComplementacoesRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const u = new URLSearchParams();
  u.set("status", "complementation_requested");
  const organizationId = firstSearchParam(sp, "organizationId");
  const formId = firstSearchParam(sp, "formId");
  if (organizationId) u.set("organizationId", organizationId);
  if (formId) u.set("formId", formId);
  redirect(`/analista/evidencias?${u.toString()}`);
}
