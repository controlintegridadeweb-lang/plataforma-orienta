import { ClipboardList } from "lucide-react";
import { AnswersShell } from "@/components/formulario/answers/answers-shell";
import { FormTabPanel } from "@/components/formulario/form-tab-panel";

type PageProps = { params: Promise<{ formId: string }> };

export default async function AdminFormularioRespostasPage({ params }: PageProps) {
  const { formId } = await params;
  return (
    <FormTabPanel
      title="Respostas"
      description="Acompanhe o preenchimento: visão geral, resumo por pergunta, lista de órgãos e detalhe individual."
      icon={ClipboardList}
    >
      <AnswersShell formId={formId} />
    </FormTabPanel>
  );
}
