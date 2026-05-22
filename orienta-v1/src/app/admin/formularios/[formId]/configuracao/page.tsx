import { FormConfig } from "@/components/formulario/form-config";

type PageProps = { params: Promise<{ formId: string }> };

export default async function AdminFormularioConfigPage({ params }: PageProps) {
  const { formId } = await params;
  return <FormConfig formId={formId} />;
}
