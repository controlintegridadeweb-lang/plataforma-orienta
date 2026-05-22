"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { LoadingButton } from "@/components/ui/loading";
import { PLAN_STATUS_LABELS } from "@/components/plano-acao/plan-status-badge";
import { saveRespondentActionPlan } from "@/lib/action-plans/client";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import {
  progressForStatus,
  statusForProgress,
  type RespondentActionPlanItem,
} from "@/lib/action-plans/respondent-presentation";
import { formSurface } from "@/lib/form-surface";
import { describeError, notify } from "@/lib/notify";
import { RespondentActionPlanProgress, RespondentActionPlanProgressSteps } from "./respondent-action-plan-progress";

type Props = {
  item: RespondentActionPlanItem;
  onSaved: () => void;
  /** Renderiza o submit como botao primario com o texto contextual. */
  submitLabel?: string;
};

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultActionText(item: RespondentActionPlanItem): string {
  const fromPlan = item.description?.trim();
  if (fromPlan && fromPlan.length >= 5) return fromPlan.slice(0, 4000);
  const fromRec = item.recommendationText?.trim();
  if (fromRec && fromRec.length >= 5) return fromRec.slice(0, 4000);
  return "Registrar ações de adequação conforme a recomendação apresentada.";
}

export function RespondentActionPlanForm({ item, onSaved, submitLabel }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<PlanStatus>(item.planStatus ?? "to_implement");
  const [actionText, setActionText] = useState(item.description || defaultActionText(item));
  const [dueDate, setDueDate] = useState(item.dueDate ?? addDaysIso(30));
  const [responsibleSector, setResponsibleSector] = useState(item.responsibleSector || "");
  const [responsibleName, setResponsibleName] = useState(item.responsibleName || "");
  const [observations, setObservations] = useState(item.observations ?? "");

  const progress = progressForStatus(status);
  const label =
    submitLabel ?? (item.hasPlan ? "Salvar alterações desta linha" : "Registrar primeira ação");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await saveRespondentActionPlan({
        planId: item.planId ?? undefined,
        recommendationId: item.recommendationId,
        formId: item.formId,
        actionText,
        dueDate,
        responsibleSector,
        responsibleName,
        status,
        observations: observations.trim() ? observations : "",
      });
      notify.success(item.hasPlan ? "Ação atualizada." : "Primeira linha criada nesta recomendação.");
      onSaved();
    } catch (e) {
      const msg = describeError(e, "Falha ao salvar esta ação.");
      setError(msg);
      notify.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error ? <p className={formSurface.messageError}>{error}</p> : null}

      <label className="block text-xs font-medium text-slate-700">
        Ação ou compromisso
        <textarea
          rows={3}
          className={`${formSurface.inputTextarea} mt-1`}
          value={actionText}
          onChange={(e) => setActionText(e.target.value)}
          required
          minLength={5}
        />
      </label>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className={formSurface.label}>Progresso da execução</span>
          <span className="text-xs font-semibold tabular-nums text-slate-700">
            {progress}%
          </span>
        </div>
        <RespondentActionPlanProgress value={progress} size="sm" />
        <div className="pt-1">
          <RespondentActionPlanProgressSteps
            value={progress}
            onChange={(step) => setStatus(statusForProgress(step))}
            disabled={pending}
          />
        </div>
        <p className="text-[11px] text-slate-500">
          Os atalhos atualizam o estado da execução: 0% = não iniciada, 25–75% = em
          andamento, 100% = concluída.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-medium text-slate-700">
          Prazo
          <input
            type="date"
            className={`${formSurface.input} mt-1`}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            required
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Área responsável
          <input
            className={`${formSurface.input} mt-1`}
            value={responsibleSector}
            onChange={(e) => setResponsibleSector(e.target.value)}
            placeholder="Ex.: TI, Jurídico"
            required
          />
        </label>
        <label className="block text-xs font-medium text-slate-700">
          Responsável nominal
          <input
            className={`${formSurface.input} mt-1`}
            value={responsibleName}
            onChange={(e) => setResponsibleName(e.target.value)}
            placeholder="Nome ou função"
            required
          />
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Status da ação (manual)
          <select
            className={`${formSurface.inputSelect} mt-1`}
            value={status}
            onChange={(e) => setStatus(e.target.value as PlanStatus)}
          >
            <option value="to_implement">{PLAN_STATUS_LABELS.to_implement}</option>
            <option value="in_progress">{PLAN_STATUS_LABELS.in_progress}</option>
            <option value="completed">{PLAN_STATUS_LABELS.completed}</option>
            <option value="cancelled">{PLAN_STATUS_LABELS.cancelled}</option>
          </select>
        </label>
        <label className="block text-xs font-medium text-slate-700 sm:col-span-2">
          Observações / relato de execução
          <textarea
            rows={3}
            className={`${formSurface.inputTextarea} mt-1`}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Notas livres, marcos atingidos, próximos passos..."
          />
        </label>
      </div>

      <LoadingButton
        type="submit"
        pending={pending}
        pendingLabel="Salvando..."
        className={`${formSurface.primaryButton} w-full`}
      >
        <Save className="h-4 w-4" aria-hidden />
        {label}
      </LoadingButton>
    </form>
  );
}
