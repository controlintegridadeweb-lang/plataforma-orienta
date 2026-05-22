import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isFormOpenForRespondent } from "@/lib/dashboards/queries";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { formStateLabelPt } from "@/lib/respondent/form-labels";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { FormFillWorkspace } from "@/components/formulario/form-fill-workspace";
import { formSurface } from "@/lib/form-surface";

type PageProps = { params: Promise<{ formId: string }> };

export default async function RespondenteFormularioResponderPage({ params }: PageProps) {
  const { formId } = await params;
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return (
      <div className={formSurface.messageWarning}>
        Sua conta nao esta vinculada a uma organizacao. Entre em contato com o administrador.
      </div>
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const { data: form, error } = await supabase
    .from("forms")
    .select("id,name,version,state")
    .eq("id", formId)
    .maybeSingle();

  if (error || !form || !isFormOpenForRespondent(form.state as string)) {
    notFound();
  }

  return (
    <FormFillWorkspace
      backHref="/respondente/formularios"
      backLabel="Voltar para meus formulários"
      title={form.name as string}
      subtitle={
        <>
          <span className="font-medium text-slate-800">{formStateLabelPt(form.state as string)}</span>
          {typeof form.version === "number" ? (
            <span>
              {" "}
              · Versão <span className="tabular-nums">{form.version}</span>
            </span>
          ) : null}
          {" · "}
          Organização{" "}
          <span className="font-medium text-slate-800">{user.organizationName ?? "—"}</span>
        </>
      }
    >
      <WorkbenchShell
        mode="respondent"
        useSessionContext
        autoLoad
        initialFormId={formId}
        lockedOrganizationId={user.organizationId}
        lockedOrganizationName={user.organizationName ?? undefined}
      />
    </FormFillWorkspace>
  );
}
