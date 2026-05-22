import type { RespondentProgress } from "@/lib/dashboards/queries";

export type RespondentDashboardSummary = {
  openForms: number;
  totalQuestions: number;
  totalAnswered: number;
  totalComplementation: number;
  progressPct: number;
};

export function computeRespondentDashboardSummary(
  forms: RespondentProgress[],
): RespondentDashboardSummary {
  const openForms = forms.length;
  const totalQuestions = forms.reduce((acc, f) => acc + f.totalQuestions, 0);
  const totalAnswered = forms.reduce((acc, f) => acc + f.answeredQuestions, 0);
  const totalComplementation = forms.reduce(
    (acc, f) => acc + f.complementationRequests,
    0,
  );
  const progressPct =
    totalQuestions > 0 ? Math.round((totalAnswered / totalQuestions) * 100) : 0;

  return {
    openForms,
    totalQuestions,
    totalAnswered,
    totalComplementation,
    progressPct,
  };
}
