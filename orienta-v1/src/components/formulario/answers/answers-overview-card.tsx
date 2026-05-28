import { CalendarClock, ClipboardList, ListChecks, Users } from "lucide-react";
import { MetricCard, type MetricCardVariant } from "@/components/ui/metric-card";
import {
  RESPONDENT_STATUS_LABEL,
  type AnswersOverview,
  type RespondentStatus,
} from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/form-surface";

const STATUS_VARIANT: Record<RespondentStatus, MetricCardVariant> = {
  nao_iniciada: "neutral",
  em_preenchimento: "info",
  completa: "default",
  submetida: "success",
  em_complementacao: "warning",
};

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AnswersOverviewCard({ overview }: { overview: AnswersOverview }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          variant="success"
          label="Total de respondentes"
          value={overview.totalRespondents}
          icon={Users}
          secondary="Quantidade de orgaos com pelo menos uma resposta."
        />
        <MetricCard
          variant="info"
          label="Ultima resposta"
          value={overview.lastAnswerAt ? formatDate(overview.lastAnswerAt) : "—"}
          icon={CalendarClock}
          valueClassName="mt-3 text-base font-semibold leading-snug text-slate-900"
          secondary="Mais recente entre todos os orgaos."
        />
        <MetricCard
          variant="neutral"
          label="Perguntas"
          value={overview.totalQuestions}
          icon={ClipboardList}
          secondary="Total de perguntas vinculadas a este formulario."
        />
      </div>

      <div className={`${formSurface.nestedCardWithHeader}`}>
        <header className={`${formSurface.cardHeader} flex items-center gap-2`}>
          <ListChecks className="h-4 w-4 text-brand-700" aria-hidden />
          <h3 className={formSurface.cardTitle}>Status dos respondentes</h3>
        </header>
        <div className="grid grid-cols-2 gap-2 px-5 py-4 sm:grid-cols-3 lg:grid-cols-5 sm:px-6">
          {(Object.keys(overview.statusBreakdown) as RespondentStatus[]).map((status) => (
            <MetricCard
              key={status}
              variant={STATUS_VARIANT[status]}
              label={RESPONDENT_STATUS_LABEL[status]}
              value={overview.statusBreakdown[status]}
              density="compact"
              contentClassName="py-3 sm:py-3.5"
              className="min-h-27 sm:min-h-28"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
