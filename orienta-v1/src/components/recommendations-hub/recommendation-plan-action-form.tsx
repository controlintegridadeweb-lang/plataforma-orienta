"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import { PLAN_STATUS_LABELS } from "@/components/plano-acao/plan-status-badge";
import { LoadingButton } from "@/components/ui/loading";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { formSurface } from "@/lib/form-surface";
import { describeError, notify } from "@/lib/notify";
import type { ActionPlanAction } from "@/lib/domain/action-plans";

export type RecommendationPlanActionSavePayload = {
  planId?: string;
  recommendationId: string;
  formId: string;
  actionText: string;
  dueDate: string;
  responsibleSector: string;
  responsibleName: string;
  status: PlanStatus;
  observations?: string;
};

type Props = {
  recommendationId: string;
  formId: string;
  recommendationText: string;
  plan: ActionPlanAction | null;
  actionCount: number;
  onSave: (payload: RecommendationPlanActionSavePayload) => Promise<void>;
  submitLabel?: string;
  /** Layout mais compacto para painéis de tarefa. */
  compact?: boolean;
};

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultActionText(text: string): string {
  const t = (text ?? "").trim();
  if (t.length >= 5) return t.slice(0, 4000);
  return "Registrar ações de adequação conforme a recomendação apresentada.";
}

export function RecommendationPlanActionForm({
  recommendationId,
  formId,
  recommendationText,
  plan,
  actionCount,
  onSave,
  submitLabel,
  compact = false,
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    setPending(true);
    try {
      await onSave({
        planId: plan?.id,
        recommendationId,
        formId,
        actionText: String(form.get("actionText") ?? ""),
        dueDate: String(form.get("dueDate") ?? ""),
        responsibleSector: String(form.get("responsibleSector") ?? ""),
        responsibleName: String(form.get("responsibleName") ?? ""),
        status: String(form.get("status") ?? "to_implement") as PlanStatus,
        observations: String(form.get("observations") ?? ""),
      });
      notify.success(plan ? "Ação atualizada." : "Ação cadastrada.");
    } catch (e) {
      const msg = describeError(e, "Falha ao salvar a ação.");
      setError(msg);
      notify.error(msg);
    } finally {
      setPending(false);
    }
  }

  const gridClass = compact
    ? "grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
    : "grid gap-3 sm:grid-cols-2";

  return (
    <form onSubmit={handleSubmit} className={compact ? "space-y-4" : "space-y-3"}>
      {error ? <p className={formSurface.messageError}>{error}</p> : null}

      {actionCount > 1 && plan && !compact ? (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-700">
          Esta recomendação possui <strong>{actionCount} ações</strong>. Você está editando uma linha
          específica.
        </p>
      ) : null}

      <label className={compact ? formSurface.fieldGroup : "block"}>
        <span className={formSurface.label}>Ação ou compromisso</span>
        <textarea
          name="actionText"
          rows={compact ? 2 : 3}
          className={formSurface.inputTextarea}
          defaultValue={plan?.actionText ?? defaultActionText(recommendationText)}
          required
        />
      </label>

      <div className={gridClass}>
        <label className={formSurface.fieldGroup}>
          <span className={formSurface.label}>Prazo</span>
          <input
            name="dueDate"
            type="date"
            className={formSurface.input}
            defaultValue={plan?.dueDate ?? addDaysIso(30)}
            required
          />
        </label>
        <label className={formSurface.fieldGroup}>
          <span className={formSurface.label}>Área responsável</span>
          <input
            name="responsibleSector"
            className={formSurface.input}
            defaultValue={plan?.responsibleSector ?? ""}
            placeholder="Ex.: TI"
            required
          />
        </label>
        <label className={formSurface.fieldGroup}>
          <span className={formSurface.label}>Responsável</span>
          <input
            name="responsibleName"
            className={formSurface.input}
            defaultValue={plan?.responsibleName ?? ""}
            placeholder="Nome ou função"
            required
          />
        </label>
        <label className={`${formSurface.fieldGroup} ${compact ? "" : "sm:col-span-2"}`}>
          <span className={formSurface.label}>Status</span>
          <select
            name="status"
            className={formSurface.inputSelect}
            defaultValue={plan?.status ?? "to_implement"}
          >
            <option value="to_implement">{PLAN_STATUS_LABELS.to_implement}</option>
            <option value="in_progress">{PLAN_STATUS_LABELS.in_progress}</option>
            <option value="completed">{PLAN_STATUS_LABELS.completed}</option>
            <option value="cancelled">{PLAN_STATUS_LABELS.cancelled}</option>
          </select>
        </label>
        <label className={`${formSurface.fieldGroup} sm:col-span-2 ${compact ? "lg:col-span-3" : ""}`}>
          <span className={formSurface.label}>Observações</span>
          <textarea
            name="observations"
            rows={compact ? 1 : 2}
            className={formSurface.inputTextarea}
            defaultValue={plan?.observations ?? ""}
            placeholder="Opcional"
          />
        </label>
      </div>

      <LoadingButton
        type="submit"
        pending={pending}
        pendingLabel="Salvando..."
        className={`${formSurface.primaryButtonSm} w-full sm:w-auto`}
      >
        <Save className="h-3.5 w-3.5" aria-hidden />
        {submitLabel ?? (plan ? "Salvar" : "Cadastrar")}
      </LoadingButton>
    </form>
  );
}
