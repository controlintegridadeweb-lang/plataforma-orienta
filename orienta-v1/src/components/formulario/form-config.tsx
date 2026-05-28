"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Lock, LockOpen, Settings } from "lucide-react";
import type { FormSummary } from "@/lib/forms/admin-service";
import {
  evidenceComplementation,
  formCycleComplementation,
} from "@/lib/labels/complementation-terms";
import { FormTabPanel } from "@/components/formulario/form-tab-panel";
import {
  closeForm,
  deleteForm,
  getForm,
  reopenForm,
  renameForm,
  setFormArchived,
  setFormDeadline,
  transitionForm,
} from "@/lib/forms/client";
import {
  INTERMEDIATE_TRANSITION_LABELS,
  allowedTransitions,
} from "@/lib/domain/workflow";
import type { WorkflowState } from "@/lib/domain/types";
import { formSurface } from "@/lib/layout/form-surface";

const STATE_LABELS: Record<string, string> = {
  draft: "Rascunho",
  submitted: "Publicado",
  under_review: "Em revisão",
  complementation_requested: formCycleComplementation.stateLabel,
  resubmitted: "Reenviado",
  consolidated: "Consolidado",
  closed: "Encerrado",
};

function formatDeadlineInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * `Date.now()` é impura para o React Compiler; encapsulamos a comparação aqui
 * para que o ponto de chamada permaneça referencialmente transparente em render.
 */
function isDeadlinePast(iso: string | null): boolean {
  if (iso == null) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return t < Date.now();
}

function formatDeadlineDisplay(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function FormConfig({
  formId,
  allowDelete = true,
  listHrefAfterDelete = "/admin/formularios",
}: {
  formId: string;
  allowDelete?: boolean;
  listHrefAfterDelete?: string;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormSummary | null>(null);
  const [name, setName] = useState("");
  const [deadlineInput, setDeadlineInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getForm(formId)
      .then((f) => {
        if (!cancelled) {
          setForm(f);
          setName(f.name);
          setDeadlineInput(formatDeadlineInput(f.responseDeadlineAt));
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  async function handleRename() {
    if (!form) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Informe um nome.");
      return;
    }
    if (trimmed === form.name) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await renameForm(formId, trimmed);
      setForm(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao renomear.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveDeadline() {
    if (!form) return;
    const trimmed = deadlineInput.trim();
    let isoUtc: string | null = null;
    if (trimmed) {
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        setError("Data inválida. Use o seletor de data e hora.");
        return;
      }
      isoUtc = parsed.toISOString();
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await setFormDeadline(formId, isoUtc);
      setForm(updated);
      setDeadlineInput(formatDeadlineInput(updated.responseDeadlineAt));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao salvar prazo.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCloseForm() {
    if (!form) return;
    if (!form.responseDeadlineAt) {
      setError("Defina o prazo de resposta antes de encerrar o ciclo.");
      return;
    }
    if (
      !confirm(
        `Encerrar o ciclo de "${form.name}"?\n\nApós encerrar:\n- novas respostas serão bloqueadas;\n- o FAMI oficial será calculado para todas as organizações ativas;\n- perguntas aplicáveis sem resposta entram com 0 ponto.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await closeForm(formId);
      const refreshed = await getForm(formId);
      setForm(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao encerrar formulário.");
    } finally {
      setBusy(false);
    }
  }

  async function handleReopenForm() {
    if (!form) return;
    if (
      !confirm(
        `Reabrir "${form.name}" para novas respostas?\n\nO FAMI oficial do último encerramento permanece até um novo fechamento.`,
      )
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await reopenForm(formId);
      const refreshed = await getForm(formId);
      setForm(refreshed);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao reabrir formulário.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTransition(to: WorkflowState, label: string) {
    if (!form) return;
    if (!confirm(`${label}?`)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await transitionForm(formId, to);
      setForm(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar estado.");
    } finally {
      setBusy(false);
    }
  }

  async function handleArchive() {
    if (!form) return;
    const target = !form.archivedAt;
    const verb = target ? "arquivar" : "desarquivar";
    if (!confirm(`Deseja ${verb} este formulário?`)) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await setFormArchived(formId, target);
      setForm(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : `Falha ao ${verb}.`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!form) return;
    if (
      !confirm(
        "Excluir este formulário? Essa ação não pode ser desfeita e remove perguntas que não estejam em outros formulários.",
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteForm(formId);
      router.push(listHrefAfterDelete);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao excluir.");
      setBusy(false);
    }
  }

  if (!form) {
    return (
      <FormTabPanel
        title="Configuracao do formulario"
        description="Nome, prazo de resposta, encerramento do ciclo e opcoes administrativas."
        icon={Settings}
      >
        <p className={formSurface.messageNeutral}>{error ?? "Carregando..."}</p>
      </FormTabPanel>
    );
  }

  const isDraft = form.state === "draft";
  const archived = Boolean(form.archivedAt);
  const isClosed = form.state === "closed";
  const canClose = form.state === "consolidated" && !isClosed;
  const deadlineDisplay = formatDeadlineDisplay(form.responseDeadlineAt);
  const deadlinePast = isDeadlinePast(form.responseDeadlineAt);
  const currentState = form.state as WorkflowState;
  const lifecycleTransitions = allowedTransitions(currentState)
    .map((to) => {
      const key = `${currentState}->${to}` as `${WorkflowState}->${WorkflowState}`;
      const label = INTERMEDIATE_TRANSITION_LABELS[key];
      return label ? { to, label } : null;
    })
    .filter((item): item is { to: WorkflowState; label: string } => item != null);

  return (
    <FormTabPanel
      title="Configuracao do formulario"
      description="Nome, prazo de resposta, encerramento do ciclo FAMI e opcoes administrativas."
      icon={Settings}
    >
      <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className={`space-y-3 ${formSurface.nestedCard}`}>
        <h3 className="text-sm font-semibold text-slate-800">Nome</h3>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isDraft || archived || busy}
            maxLength={200}
            className={`min-w-70 flex-1 ${formSurface.input}`}
          />
          <button
            type="button"
            disabled={!isDraft || archived || busy || name.trim() === form.name}
            onClick={handleRename}
            className={`${formSurface.primaryButtonSm} disabled:opacity-50`}
          >
            Salvar nome
          </button>
        </div>
        {!isDraft ? (
          <p className="text-xs text-slate-500">
            Renomear é permitido apenas em rascunhos. Estado atual:{" "}
            {STATE_LABELS[form.state] ?? form.state}.
          </p>
        ) : null}
      </div>

      <div className={`space-y-4 ${formSurface.nestedCard}`}>
        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Ciclo de respostas e FAMI</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">
              Defina o prazo para orientar os respondentes. O cálculo FAMI só ocorre ao{" "}
              <strong className="font-semibold text-slate-800">encerrar o ciclo</strong> — não
              há score provisório durante o preenchimento.
            </p>
          </div>

            <label className="flex max-w-md flex-col gap-1.5 text-sm font-medium text-slate-600">
              Prazo de resposta
              <input
                type="datetime-local"
                value={deadlineInput}
                onChange={(e) => setDeadlineInput(e.target.value)}
                disabled={isClosed || archived || busy}
                className={formSurface.input}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isClosed || archived || busy}
                onClick={handleSaveDeadline}
                className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
              >
                Salvar prazo
              </button>
              {deadlineDisplay ? (
                <span
                  className={`text-xs ${deadlinePast && !isClosed ? "font-semibold text-rose-600" : "text-slate-500"}`}
                >
                  Prazo atual: {deadlineDisplay}
                  {deadlinePast && !isClosed ? " (vencido)" : ""}
                </span>
              ) : (
                <span className="text-xs text-amber-700">Prazo ainda não definido</span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
              <p className="w-full text-xs text-slate-500" title={formCycleComplementation.configHint}>
                {formCycleComplementation.configHint}
              </p>
              {lifecycleTransitions.length > 0 && !archived && !isClosed
                ? lifecycleTransitions.map(({ to, label }) => (
                    <button
                      key={to}
                      type="button"
                      disabled={busy}
                      onClick={() => void handleTransition(to, label)}
                      className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
                      title={formCycleComplementation.configHint}
                    >
                      {label}
                    </button>
                  ))
                : null}
              {canClose ? (
                <button
                  type="button"
                  disabled={busy || !form.responseDeadlineAt}
                  onClick={handleCloseForm}
                  className={`inline-flex items-center gap-1.5 ${formSurface.primaryButtonSm} disabled:opacity-50`}
                  title={
                    !form.responseDeadlineAt
                      ? "Defina o prazo antes de encerrar"
                      : "Calcula FAMI oficial e bloqueia novas respostas"
                  }
                >
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Encerrar ciclo e calcular FAMI
                </button>
              ) : null}
              {isClosed ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleReopenForm}
                  className={`inline-flex items-center gap-1.5 ${formSurface.secondaryButtonSm} disabled:opacity-50`}
                >
                  <LockOpen className="h-3.5 w-3.5" aria-hidden />
                  Reabrir para respostas
                </button>
              ) : null}
              {!canClose && !isClosed && form.state !== "draft" ? (
                <p className="text-xs text-slate-500">
                  Encerramento exige formulário consolidado. Estado:{" "}
                  {STATE_LABELS[form.state] ?? form.state}.
                </p>
              ) : null}
              {isClosed && form.closedAt ? (
                <p className="text-xs text-slate-500">
                  Encerrado em {formatDeadlineDisplay(form.closedAt)}. FAMI oficial vigente.
                </p>
              ) : null}
            </div>
        </div>
      </div>

      <div className={`space-y-3 ${formSurface.nestedCard}`}>
        <h3 className="text-sm font-semibold text-slate-800">Arquivamento</h3>
        <p className="text-xs text-slate-600">
          Formulários arquivados ficam ocultos da lista principal mas preservam histórico.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={handleArchive}
          className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
        >
          {archived ? "Desarquivar" : "Arquivar"}
        </button>
      </div>

      {allowDelete ? (
        <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/40 p-4">
          <h3 className="text-sm font-semibold text-rose-800">Zona perigosa</h3>
          <p className="text-xs text-rose-700">
            Exclusão definitiva só é permitida em rascunhos sem respostas.
          </p>
          <button
            type="button"
            disabled={!isDraft || busy}
            onClick={handleDelete}
            className="rounded-md bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Excluir formulário
          </button>
        </div>
      ) : null}
      </div>
    </FormTabPanel>
  );
}
