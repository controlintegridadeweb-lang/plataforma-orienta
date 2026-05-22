import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FormEditShell } from "@/components/formulario/form-edit-shell";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ formId: string }>;
};

export default async function FormularioLayout({ children, params }: LayoutProps) {
  const { formId } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id,name,state,archived_at")
    .eq("id", formId)
    .maybeSingle();

  if (!form) notFound();

  return (
    <FormEditShell
      formId={formId}
      formName={form.name as string}
      state={String(form.state)}
      archived={Boolean(form.archived_at)}
      backHref="/admin/formularios"
      backLabel="Lista de formulários"
    >
      {children}
    </FormEditShell>
  );
}
