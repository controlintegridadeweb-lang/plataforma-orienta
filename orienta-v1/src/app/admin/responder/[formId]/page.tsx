import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { firstSearchParam } from "@/lib/admin/search-params";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { FormFillWorkspace } from "@/components/formulario/form-fill-workspace";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";

type PageProps = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminResponderFormularioPage({
  params,
  searchParams,
}: PageProps) {
  const { formId } = await params;
  const organizationId = firstSearchParam(await searchParams, "orgId")?.trim() ?? "";
  if (!organizationId) notFound();

  const user = await getCurrentUser();
  if (!user) notFound();

  // Admin scoped (com organization_id no perfil) so pode responder em
  // nome da propria organizacao. Admin global pode responder por qualquer.
  if (!isGlobalAdmin(user) && user.organizationId !== organizationId) {
    notFound();
  }

  const supabase = createSupabaseServiceRoleClient();
  const [{ data: form }, { data: org }] = await Promise.all([
    supabase.from("forms").select("id,name,version").eq("id", formId).maybeSingle(),
    supabase.from("organizations").select("id,name").eq("id", organizationId).maybeSingle(),
  ]);

  if (!form || !org) notFound();

  return (
    <FormFillWorkspace
      backHref="/admin/responder"
      backLabel="Voltar para responder por organização"
      title={form.name as string}
      subtitle={
        <>
          Organização{" "}
          <span className="font-medium text-slate-800">{org.name as string}</span>
        </>
      }
    >
      <WorkbenchShell
        mode="analyst"
        useSessionContext
        autoLoad
        initialFormId={formId}
        lockedOrganizationId={organizationId}
        lockedOrganizationName={org.name as string}
      />
    </FormFillWorkspace>
  );
}
