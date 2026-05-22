import { getCurrentUser } from "@/lib/auth/current-user";
import { FamiMaturityShell } from "@/components/fami/fami-maturity-shell";
import { firstSearchParam } from "@/lib/admin/search-params";
import { layout } from "@/lib/design-system";

export default async function AdminMaturidadePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getCurrentUser();
  const sp = await searchParams;
  const orgFromUrl = firstSearchParam(sp, "organizationId") ?? "";
  const formFromUrl = firstSearchParam(sp, "formId") ?? "";
  const profileOrg = user?.organizationId ?? "";

  /**
   * `organizationId=all` na URL = visao Geral (todas as organizacoes). Sem
   * parametro e sem org no perfil, admin abre na Geral por padrao -- evita
   * a tela vazia "Selecione uma organizacao..." anterior.
   */
  const defaultOrganizationId =
    orgFromUrl || (profileOrg ? profileOrg : null);
  const defaultFormId = formFromUrl || null;

  return (
    <div className={layout.pageStack}>
      <FamiMaturityShell
        mode="admin"
        defaultOrganizationId={defaultOrganizationId}
        defaultFormId={defaultFormId}
      />
    </div>
  );
}
