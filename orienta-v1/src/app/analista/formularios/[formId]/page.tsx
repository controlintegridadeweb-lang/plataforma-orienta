import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { isFormOpenForRespondent } from "@/lib/dashboards/queries";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import { formStateLabelPt } from "@/lib/respondent/form-labels";
import { WorkbenchShell } from "@/components/workbench/workbench-shell";
import { FormFillWorkspace } from "@/components/formulario/form-fill-workspace";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";

type PageProps = {
  params: Promise<{ formId: string }>;
  searchParams: Promise<{ orgId?: string }>;
};

export default async function AnalistaFormularioResponderPage({ params, searchParams }: PageProps) {
  const { formId } = await params;
  const { orgId } = await searchParams;

  if (!orgId) {
    return (
      <div className={layout.sectionStack}>
        <Link
          href="/analista/formularios"
          className="inline-flex items-center gap-1.5 text-sm text-emerald-800 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Voltar para a lista
        </Link>
        <div className={formSurface.messageWarning}>
          Selecione uma organizacao na lista de formularios para abrir esta tela.
        </div>
      </div>
    );
  }

  const supabase = createSupabaseServiceRoleClient();
  const [formRes, orgRes] = await Promise.all([
    supabase.from("forms").select("id,name,version,state").eq("id", formId).maybeSingle(),
    supabase.from("organizations").select("id,name").eq("id", orgId).maybeSingle(),
  ]);

  if (formRes.error || !formRes.data || !isFormOpenForRespondent(formRes.data.state as string)) {
    notFound();
  }
  if (orgRes.error || !orgRes.data) {
    notFound();
  }

  const form = formRes.data;
  const organizationName = (orgRes.data.name as string) ?? "";

  return (
    <FormFillWorkspace
      backHref="/analista/formularios"
      backLabel="Voltar para a lista"
      title={form.name as string}
      subtitle={
        <>
          {formStateLabelPt(form.state as string)}
          {typeof form.version === "number" ? (
            <span>
              {" "}
              · Versão <span className="tabular-nums">{form.version}</span>
            </span>
          ) : null}
          {" · "}
          Respondendo em nome de{" "}
          <span className="font-medium text-slate-800">{organizationName || "—"}</span>
        </>
      }
    >
      <WorkbenchShell
        mode="respondent"
        useSessionContext
        autoLoad
        initialFormId={formId}
        lockedOrganizationId={orgId}
        lockedOrganizationName={organizationName || undefined}
      />
    </FormFillWorkspace>
  );
}
