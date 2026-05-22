import { FormConfig } from "@/components/formulario/form-config";

type PageProps = { params: Promise<{ formId: string }> };

export default async function AnalistaFormularioConfigPage({ params }: PageProps) {
  const { formId } = await params;
  return (
    <FormConfig
      formId={formId}
      allowDelete={false}
      listHrefAfterDelete="/analista/formularios"
    />
  );
}
