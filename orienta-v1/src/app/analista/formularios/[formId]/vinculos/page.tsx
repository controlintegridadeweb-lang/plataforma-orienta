import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import {
  FormQuestionBindingsPanel,
  type FormQuestionRow,
} from "@/components/formulario/form-question-bindings-panel";
import { FormQuestionWaiversPanel } from "@/components/formulario/form-question-waivers-panel";
import { FormTabPanel } from "@/components/formulario/form-tab-panel";
import { formSurface } from "@/lib/form-surface";

type PageProps = { params: Promise<{ formId: string }> };

export default async function AnalistaFormularioVinculosPage({ params }: PageProps) {
  const { formId } = await params;
  const supabase = createSupabaseServiceRoleClient();

  const { data: fqRows, error: fqErr } = await supabase
    .from("form_questions")
    .select("question_id, order_index")
    .eq("form_id", formId)
    .order("order_index", { ascending: true });

  if (fqErr) {
    notFound();
  }

  const questionIds = (fqRows ?? []).map((r) => r.question_id as string);
  let questions: FormQuestionRow[] = [];

  if (questionIds.length > 0) {
    const { data: qRows, error: qErr } = await supabase
      .from("questions")
      .select("id,prompt,requires_evidence")
      .in("id", questionIds);

    if (!qErr && qRows) {
      const byId = new Map<string, FormQuestionRow>();
      for (const q of qRows) {
        byId.set(q.id as string, {
          id: q.id as string,
          prompt: q.prompt as string,
          requiresEvidence: Boolean(q.requires_evidence),
        });
      }
      questions = questionIds
        .map((id) => byId.get(id))
        .filter((q): q is FormQuestionRow => Boolean(q));
    }
  }

  return (
    <FormTabPanel
      title="Vinculos com a biblioteca"
      description="Associe cada pergunta a um eixo e uma secao, escolha o tipo de resposta e preencha as recomendacoes por cenario."
      icon={Link2}
      width="wide"
    >
      {questions.length === 0 ? (
        <div className={formSurface.empty.container}>
          <p className={formSurface.empty.description}>
            Nenhuma pergunta vinculada. Use a aba Perguntas para adicionar.
          </p>
        </div>
      ) : (
        <>
          <FormQuestionWaiversPanel questions={questions} />
          <FormQuestionBindingsPanel formId={formId} questions={questions} />
        </>
      )}
    </FormTabPanel>
  );
}
