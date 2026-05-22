import { FormQuestionsManager } from "@/components/formulario/form-questions-manager";

type PageProps = { params: Promise<{ formId: string }> };

export default async function AnalistaFormularioPerguntasPage({ params }: PageProps) {
  const { formId } = await params;
  return <FormQuestionsManager formId={formId} />;
}
