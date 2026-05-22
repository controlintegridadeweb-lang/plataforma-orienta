import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FormEditShell } from "@/components/formulario/form-edit-shell";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";

type LayoutProps = {
  children: ReactNode;
  params: Promise<{ formId: string }>;
};

export default async function AnalistaFormularioEditLayout({ children, params }: LayoutProps) {
  const { formId } = await params;
  const supabase = createSupabaseServiceRoleClient();
  const { data: form } = await supabase
    .from("forms")
    .select("id,name,state,archived_at")
    .eq("id", formId)
    .maybeSingle();

  if (!form) notFound();

  const pathname = (await headers()).get("x-pathname") ?? "";
  const segments = pathname.split("/").filter(Boolean);
  const isResponderOnlyRoute =
    segments.length === 3 &&
    segments[0] === "analista" &&
    segments[1] === "formularios" &&
    segments[2] === formId;

  return (
    <FormEditShell
      formId={formId}
      formName={form.name as string}
      state={String(form.state)}
      archived={Boolean(form.archived_at)}
      backHref="/analista/formularios"
      backLabel="Formulários"
      scope="analista"
      showTabs={!isResponderOnlyRoute}
    >
      {children}
    </FormEditShell>
  );
}
