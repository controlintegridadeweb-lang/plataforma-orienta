"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, ShieldOff, X } from "lucide-react";
import { InlineLoader, Spinner } from "@/components/ui/loading";
import type { FormQuestionRow } from "@/components/formulario/form-question-bindings-panel";
import {
  clearQuestionWaiver,
  listQuestionWaivers,
  setQuestionWaiver,
  type QuestionWaiverRow,
} from "@/lib/forms/waiver-client";
import { loadRecommendationFilters } from "@/lib/recommendations/client";
import { formSurface } from "@/lib/layout/form-surface";
import { describeError, notify } from "@/lib/notify";

type Props = {
  questions: FormQuestionRow[];
};

type OrgOption = { id: string; name: string };

type WaiversByQuestion = Map<string, Map<string, QuestionWaiverRow>>;

function buildWaiversIndex(rows: QuestionWaiverRow[]): WaiversByQuestion {
  const index: WaiversByQuestion = new Map();
  for (const row of rows) {
    const byOrg = index.get(row.questionId) ?? new Map<string, QuestionWaiverRow>();
    byOrg.set(row.organizationId, row);
    index.set(row.questionId, byOrg);
  }
  return index;
}

type EditorState = {
  questionId: string;
  prompt: string;
  selectedOrgIds: Set<string>;
  reason: string;
};

function WaiverEditorModal({
  open,
  questionPrompt,
  organizations,
  selectedOrgIds,
  reason,
  orgFilter,
  saving,
  onOrgFilterChange,
  onToggleOrg,
  onSelectAll,
  onClearAll,
  onReasonChange,
  onClose,
  onSave,
}: {
  open: boolean;
  questionPrompt: string;
  organizations: OrgOption[];
  selectedOrgIds: Set<string>;
  reason: string;
  orgFilter: string;
  saving: boolean;
  onOrgFilterChange: (value: string) => void;
  onToggleOrg: (orgId: string) => void;
  onSelectAll: (orgIds: string[]) => void;
  onClearAll: () => void;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const filteredOrgs = useMemo(() => {
    const q = orgFilter.trim().toLowerCase();
    if (!q) return organizations;
    return organizations.filter((o) => o.name.toLowerCase().includes(q));
  }, [organizations, orgFilter]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="waiver-editor-title"
    >
      <div className="flex max-h-[min(90vh,180)] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-100/80">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-brand-50 px-5 py-4">
          <div className="min-w-0">
            <h3 id="waiver-editor-title" className={formSurface.cardTitle}>
              �rg�os dispensados
            </h3>
            <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
              {questionPrompt}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="shrink-0 rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="text-xs leading-relaxed text-slate-600">
            Marque todos os �rg�os para os quais esta pergunta{" "}
            <strong className="font-semibold text-slate-800">n�o se aplica</strong>. A dispensa
            vale em qualquer formul�rio que inclua a pergunta.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={orgFilter}
              onChange={(e) => onOrgFilterChange(e.target.value)}
              placeholder="Filtrar �rg�os..."
              className={`min-w-50 flex-1 ${formSurface.input}`}
            />
            <button
              type="button"
              disabled={saving || filteredOrgs.length === 0}
              onClick={() => onSelectAll(filteredOrgs.map((o) => o.id))}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              Marcar vis�veis
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={onClearAll}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              Limpar
            </button>
          </div>

          <ul className="max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50/50 p-2">
            {filteredOrgs.length === 0 ? (
              <li className="px-2 py-3 text-center text-xs text-slate-500">
                Nenhum �rg�o encontrado.
              </li>
            ) : (
              filteredOrgs.map((org) => {
                const checked = selectedOrgIds.has(org.id);
                return (
                  <li key={org.id}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-slate-800 hover:bg-white">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={saving}
                        onChange={() => onToggleOrg(org.id)}
                        className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand/30"
                      />
                      <span className="min-w-0 flex-1 truncate">{org.name}</span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-600">
            Justificativa (opcional)
            <textarea
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              disabled={saving}
              rows={3}
              maxLength={1000}
              placeholder="Ex.: estrutura militar sem comit� de sustentabilidade"
              className={formSurface.inputTextarea}
            />
            <span className="text-micro font-normal text-slate-500">
              Aplicada aos �rg�os marcados ao salvar.
            </span>
          </label>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <span className="mr-auto text-xs text-slate-500">
            {selectedOrgIds.size} �rg�o{selectedOrgIds.size === 1 ? "" : "s"} selecionado
            {selectedOrgIds.size === 1 ? "" : "s"}
          </span>
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className={`inline-flex items-center gap-1.5 ${formSurface.primaryButtonSm} disabled:opacity-50`}
          >
            {saving ? (
              <>
                <Spinner size="sm" />
                Salvando�
              </>
            ) : (
              "Salvar dispensas"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function FormQuestionWaiversPanel({ questions }: Props) {
  const [organizations, setOrganizations] = useState<OrgOption[]>([]);
  const [waiversByQuestion, setWaiversByQuestion] = useState<WaiversByQuestion>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [orgFilter, setOrgFilter] = useState("");
  const [saving, setSaving] = useState(false);

  const orgNameById = useMemo(
    () => new Map(organizations.map((o) => [o.id, o.name])),
    [organizations],
  );

  const reloadWaivers = useCallback(async (orgs: OrgOption[]) => {
    if (orgs.length === 0) {
      setWaiversByQuestion(new Map());
      return;
    }
    const batches = await Promise.all(orgs.map((o) => listQuestionWaivers(o.id)));
    setWaiversByQuestion(buildWaiversIndex(batches.flat()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadRecommendationFilters()
      .then(async (f) => {
        if (cancelled) return;
        const orgs = f.organizations;
        setOrganizations(orgs);
        await reloadWaivers(orgs);
      })
      .catch((error) => {
        if (!cancelled) notify.error(describeError(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reloadWaivers]);

  const filteredQuestions = questions.filter((q) => {
    if (!filter.trim()) return true;
    return q.prompt.toLowerCase().includes(filter.trim().toLowerCase());
  });

  function openEditor(question: FormQuestionRow) {
    const current = waiversByQuestion.get(question.id);
    const selectedOrgIds = new Set(current ? [...current.keys()] : []);
    const reasons = current
      ? [...current.values()].map((w) => w.reason?.trim() ?? "").filter(Boolean)
      : [];
    const uniqueReasons = [...new Set(reasons)];
    setOrgFilter("");
    setEditor({
      questionId: question.id,
      prompt: question.prompt,
      selectedOrgIds,
      reason: uniqueReasons.length === 1 ? uniqueReasons[0]! : "",
    });
  }

  function closeEditor() {
    if (saving) return;
    setEditor(null);
    setOrgFilter("");
  }

  function toggleOrg(orgId: string) {
    setEditor((prev) => {
      if (!prev) return prev;
      const next = new Set(prev.selectedOrgIds);
      if (next.has(orgId)) next.delete(orgId);
      else next.add(orgId);
      return { ...prev, selectedOrgIds: next };
    });
  }

  async function saveEditor() {
    if (!editor) return;
    const current = waiversByQuestion.get(editor.questionId) ?? new Map();
    const desired = editor.selectedOrgIds;
    const trimmedReason = editor.reason.trim();

    const toRemove = [...current.keys()].filter((orgId) => !desired.has(orgId));
    const toAdd = [...desired].filter((orgId) => !current.has(orgId));
    const toUpdate = [...desired].filter((orgId) => {
      if (!current.has(orgId)) return false;
      const prevReason = current.get(orgId)?.reason?.trim() ?? "";
      return prevReason !== trimmedReason;
    });

    if (toRemove.length === 0 && toAdd.length === 0 && toUpdate.length === 0) {
      closeEditor();
      return;
    }

    setSaving(true);
    try {
      await Promise.all([
        ...toRemove.map((organizationId) =>
          clearQuestionWaiver({ organizationId, questionId: editor.questionId }),
        ),
        ...toAdd.map((organizationId) =>
          setQuestionWaiver({
            organizationId,
            questionId: editor.questionId,
            reason: trimmedReason || null,
          }),
        ),
        ...toUpdate.map((organizationId) =>
          setQuestionWaiver({
            organizationId,
            questionId: editor.questionId,
            reason: trimmedReason || null,
          }),
        ),
      ]);
      await reloadWaivers(organizations);
      notify.success("Dispensas atualizadas.");
      setEditor(null);
      setOrgFilter("");
    } catch (error) {
      notify.error(describeError(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className={`space-y-4 ${formSurface.nestedCard}`}>
        <div>
          <h3 className="text-sm font-semibold text-slate-800">Dispensa por �rg�o</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            Para cada pergunta, escolha um ou mais �rg�os aos quais ela{" "}
            <strong className="font-semibold text-slate-800">n�o se aplica</strong>. A dispensa
            fica na pergunta e vale em todos os formul�rios que a inclu�rem.
          </p>
        </div>

        <label className="flex max-w-md flex-col gap-1.5 text-sm font-medium text-slate-600">
          Filtrar perguntas
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Buscar no enunciado..."
            className={formSurface.input}
          />
        </label>

        {loading ? (
          <InlineLoader
            label="Carregando dispensas�"
            className="inline-flex items-center gap-2 text-sm text-slate-500"
          />
        ) : filteredQuestions.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhuma pergunta encontrada.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
            {filteredQuestions.map((q) => {
              const waivedFor = waiversByQuestion.get(q.id);
              const waivedOrgIds = waivedFor ? [...waivedFor.keys()] : [];
              const waivedNames = waivedOrgIds
                .map((id) => orgNameById.get(id))
                .filter((name): name is string => Boolean(name));

              return (
                <li
                  key={q.id}
                  className="flex flex-wrap items-start justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="text-sm text-slate-800">{q.prompt}</p>
                    {waivedNames.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {waivedNames.map((name) => (
                          <span
                            key={name}
                            className={`${formSurface.badge.base} ${formSurface.badge.neutral}`}
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Nenhum �rg�o dispensado.</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => openEditor(q)}
                    className={`inline-flex shrink-0 items-center gap-1.5 ${formSurface.secondaryButtonSm}`}
                  >
                    {waivedOrgIds.length > 0 ? (
                      <>
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                        Editar ({waivedOrgIds.length})
                      </>
                    ) : (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" aria-hidden />
                        Dispensar �rg�os
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {editor ? (
        <WaiverEditorModal
          open
          questionPrompt={editor.prompt}
          organizations={organizations}
          selectedOrgIds={editor.selectedOrgIds}
          reason={editor.reason}
          orgFilter={orgFilter}
          saving={saving}
          onOrgFilterChange={setOrgFilter}
          onToggleOrg={toggleOrg}
          onSelectAll={(orgIds) =>
            setEditor((prev) =>
              prev
                ? {
                    ...prev,
                    selectedOrgIds: new Set([...prev.selectedOrgIds, ...orgIds]),
                  }
                : prev,
            )
          }
          onClearAll={() =>
            setEditor((prev) => (prev ? { ...prev, selectedOrgIds: new Set() } : prev))
          }
          onReasonChange={(value) =>
            setEditor((prev) => (prev ? { ...prev, reason: value } : prev))
          }
          onClose={closeEditor}
          onSave={() => void saveEditor()}
        />
      ) : null}
    </>
  );
}
