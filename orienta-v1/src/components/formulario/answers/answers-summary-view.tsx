import { Inbox } from "lucide-react";
import type { AnswersSummary } from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/layout/form-surface";
import { AnswersSummaryQuestionCard } from "./answers-summary-question-card";

export function AnswersSummaryView({ summary }: { summary: AnswersSummary }) {
  if (summary.questions.length === 0) {
    return (
      <div className={formSurface.empty.container}>
        <span className={formSurface.empty.iconWrap}>
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <p className={formSurface.empty.title}>Nenhuma pergunta vinculada</p>
        <p className={formSurface.empty.description}>
          Vincule perguntas ao formulario na aba &quot;Perguntas&quot; para acompanhar o
          resumo das respostas aqui.
        </p>
      </div>
    );
  }

  if (summary.totalRespondents === 0) {
    return (
      <div className={formSurface.empty.container}>
        <span className={formSurface.empty.iconWrap}>
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <p className={formSurface.empty.title}>Sem respostas ainda</p>
        <p className={formSurface.empty.description}>
          Quando algum orgao comecar a responder, o resumo agregado e os graficos
          aparecerao aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {summary.questions.map((q) => (
        <AnswersSummaryQuestionCard key={q.questionId} question={q} />
      ))}
    </div>
  );
}
