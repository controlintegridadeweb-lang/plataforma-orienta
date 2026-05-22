import type { AnswersSummaryQuestion } from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/form-surface";
import { AnswerDistributionChart } from "./charts/answer-distribution-chart";

const ANSWER_TYPE_LABEL: Record<AnswersSummaryQuestion["answerType"], string> = {
  yes_no: "Objetiva (Sim/Nao)",
  scale: "Escala",
  numeric: "Numerica",
  text: "Discursiva",
};

export function AnswersSummaryQuestionCard({
  question,
}: {
  question: AnswersSummaryQuestion;
}) {
  return (
    <article className={`${formSurface.nestedCardWithHeader}`}>
      <header className={`${formSurface.cardHeader} space-y-1`}>
        <div className="flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-brand-100 px-1.5 text-xs font-semibold text-brand-800">
            {question.orderIndex + 1}
          </span>
          <span className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}>
            {ANSWER_TYPE_LABEL[question.answerType]}
          </span>
          <span className="ml-auto text-xs text-slate-500">
            {question.totalResponses} resposta{question.totalResponses === 1 ? "" : "s"}
          </span>
        </div>
        <h3 className={`${formSurface.cardTitle} leading-snug`}>{question.prompt}</h3>
      </header>
      <div className="px-5 py-5 sm:px-6">
        <AnswerDistributionChart
          answerType={question.answerType}
          distribution={question.distribution}
          total={question.totalResponses}
          textEntries={question.textEntries}
        />
      </div>
    </article>
  );
}
