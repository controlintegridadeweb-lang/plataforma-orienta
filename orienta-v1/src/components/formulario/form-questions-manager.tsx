"use client";

import {
  ChevronDown,
  ChevronUp,
  ListChecks,
  Paperclip,
} from "lucide-react";
import { Spinner } from "@/components/ui/loading";
import { useEffect, useState, type FormEvent } from "react";
import { FormEvidenceRequirementField } from "@/components/formulario/form-evidence-requirement-field";
import { FormTabPanel } from "@/components/formulario/form-tab-panel";
import type { QuestionRow } from "@/lib/forms/admin-service";
import {
  createFormQuestion,
  listFormQuestions,
  removeFormQuestion,
  reorderFormQuestions,
  updateFormQuestion,
} from "@/lib/forms/client";
import { typography } from "@/lib/layout/design-system";
import { formSurface } from "@/lib/layout/form-surface";

const questionCardClassName =
  "rounded-xl border border-slate-200/90 bg-white p-4 shadow-card sm:p-5";

const questionPromptClassName =
  "mt-2 text-sm font-medium leading-relaxed text-slate-900 sm:text-base";

type Props = { formId: string };

export function FormQuestionsManager({ formId }: Props) {
  const [questions, setQuestions] = useState<QuestionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");

  const [newPrompt, setNewPrompt] = useState("");
  const [newRequiresEvidence, setNewRequiresEvidence] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listFormQuestions(formId)
      .then((data) => {
        if (!cancelled) setQuestions(data);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Falha ao carregar.");
      });
    return () => {
      cancelled = true;
    };
  }, [formId]);

  async function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!newPrompt.trim()) {
      setError("Informe o enunciado da pergunta.");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      const q = await createFormQuestion(formId, {
        prompt: newPrompt.trim(),
        requiresEvidence: newRequiresEvidence,
      });
      setQuestions((prev) => [...(prev ?? []), q]);
      setNewPrompt("");
      setNewRequiresEvidence(false);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Falha ao criar.");
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleEvidence(q: QuestionRow, checked: boolean) {
    if (checked === q.requiresEvidence) return;
    setBusyId(q.id);
    setError(null);
    try {
      const updated = await updateFormQuestion(formId, q.id, {
        requiresEvidence: checked,
      });
      setQuestions((prev) => (prev ?? []).map((x) => (x.id === q.id ? updated : x)));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSavePrompt(q: QuestionRow) {
    const next = draft.trim();
    if (!next) {
      setError("O enunciado não pode ficar vazio.");
      return;
    }
    if (next === q.prompt) {
      setEditingId(null);
      return;
    }
    setBusyId(q.id);
    setError(null);
    try {
      const updated = await updateFormQuestion(formId, q.id, { prompt: next });
      setQuestions((prev) => (prev ?? []).map((x) => (x.id === q.id ? updated : x)));
      setEditingId(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(q: QuestionRow) {
    if (
      !confirm(
        `Remover "${q.prompt.slice(0, 60)}${q.prompt.length > 60 ? "..." : ""}" deste formulário?`,
      )
    )
      return;
    setBusyId(q.id);
    setError(null);
    try {
      await removeFormQuestion(formId, q.id);
      setQuestions((prev) => (prev ?? []).filter((x) => x.id !== q.id));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao remover.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleMove(q: QuestionRow, direction: "up" | "down") {
    const list = questions ?? [];
    const idx = list.findIndex((x) => x.id === q.id);
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || targetIdx < 0 || targetIdx >= list.length) return;
    const nextOrder = [...list];
    const [moved] = nextOrder.splice(idx, 1);
    nextOrder.splice(targetIdx, 0, moved);

    setQuestions(nextOrder);
    setBusyId(q.id);
    setError(null);
    try {
      const persisted = await reorderFormQuestions(
        formId,
        nextOrder.map((x) => x.id),
      );
      setQuestions(persisted);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao reordenar.");
      setQuestions(list);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <FormTabPanel
      title="Perguntas do formulário"
      description="Monte o questionário com enunciados claros, ordem definida e exigência de evidência quando necessário."
      icon={ListChecks}
    >
      {error ? <div className={formSurface.messageError}>{error}</div> : null}

      <form onSubmit={handleCreate} className="space-y-4 border-b border-slate-100 pb-5">
        <div className={formSurface.fieldGroup}>
          <label htmlFor="new-question-prompt" className="text-sm font-medium text-slate-800">
            Nova pergunta
          </label>
          <p className="text-xs text-slate-500">
            Texto exibido ao respondente. Você pode reordenar e editar depois.
          </p>
          <textarea
            id="new-question-prompt"
            placeholder="Digite o enunciado da pergunta"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
            rows={3}
            maxLength={500}
            className={`${formSurface.inputTextarea} min-h-19`}
          />
        </div>

        <FormEvidenceRequirementField
          id="new-question-evidence"
          checked={newRequiresEvidence}
          onChange={setNewRequiresEvidence}
        />

        <div className="flex justify-end border-t border-slate-100 pt-4">
          <button
            type="submit"
            disabled={creating || !newPrompt.trim()}
            className={formSurface.primaryButtonSm}
          >
            {creating ? (
              <>
                <Spinner size="md" />
                Adicionando…
              </>
            ) : (
              "Adicionar pergunta"
            )}
          </button>
        </div>
      </form>

      {questions === null ? (
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <Spinner size="xl" className="text-brand" />
          <p className="text-sm font-medium text-slate-700">Carregando perguntas…</p>
        </div>
      ) : questions.length === 0 ? (
        <div className={formSurface.empty.container}>
          <span className={formSurface.empty.iconWrap}>
            <ListChecks className="h-5 w-5" aria-hidden />
          </span>
          <p className={formSurface.empty.title}>Nenhuma pergunta ainda</p>
          <p className={formSurface.empty.description}>
            Use o campo acima para adicionar o primeiro enunciado.
          </p>
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Lista de perguntas">
          {questions.map((q, idx) => {
            const editing = editingId === q.id;
            const isBusy = busyId === q.id;

            return (
              <li key={q.id} className={questionCardClassName}>
                <div className="flex items-start justify-between gap-3">
                  <p className={typography.meta}>Pergunta {idx + 1}</p>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      disabled={idx === 0 || isBusy}
                      onClick={() => handleMove(q, "up")}
                      title="Mover para cima"
                      aria-label="Mover pergunta para cima"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                    <button
                      type="button"
                      disabled={idx === questions.length - 1 || isBusy}
                      onClick={() => handleMove(q, "down")}
                      title="Mover para baixo"
                      aria-label="Mover pergunta para baixo"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </div>

                {editing ? (
                  <div className={`${formSurface.fieldGroup} mt-3`}>
                    <label htmlFor={`edit-prompt-${q.id}`} className="text-sm font-medium text-slate-800">
                      Enunciado
                    </label>
                    <textarea
                      id={`edit-prompt-${q.id}`}
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className={`${formSurface.inputTextarea} min-h-19`}
                    />
                  </div>
                ) : (
                  <p className={questionPromptClassName}>{q.prompt}</p>
                )}

                {q.requiresEvidence && !editing ? (
                  <p className="mt-2 flex items-start gap-2 text-xs leading-snug text-slate-600">
                    <Paperclip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                    <span>Esta pergunta exige comprovante quando a resposta for Sim.</span>
                  </p>
                ) : null}

                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <FormEvidenceRequirementField
                    id={`evidence-${q.id}`}
                    checked={q.requiresEvidence}
                    disabled={isBusy}
                    onChange={(checked) => handleToggleEvidence(q, checked)}
                  />

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          disabled={isBusy}
                          className={formSurface.secondaryButtonSm}
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSavePrompt(q)}
                          className={formSurface.primaryButtonSm}
                        >
                          {isBusy ? "Salvando…" : "Salvar enunciado"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemove(q)}
                          className={formSurface.dangerButton}
                        >
                          Remover
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => {
                            setDraft(q.prompt);
                            setEditingId(q.id);
                          }}
                          className={formSurface.secondaryButtonSm}
                        >
                          Editar enunciado
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </FormTabPanel>
  );
}
