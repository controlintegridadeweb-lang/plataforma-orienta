"use client";

import {
  AlertCircle,
  Check,
  FileWarning,
  Link2,
  Paperclip,
  Trash2,
  Upload,
} from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import {
  workbenchRowAllowsPartial,
  type WorkbenchRow,
} from "@/lib/workbench/load-workbench-payload";
import {
  validateYesWithEvidence,
  type YesEvidenceFieldErrors,
} from "@/lib/workbench/validate-yes-evidence";

export type EvidenceDraft = {
  kind: "file" | "link" | null;
  title: string;
  description: string;
  externalLink: string;
  storagePath: string | null;
};

export type RespondentSectionGroup = {
  name: string;
  rows: WorkbenchRow[];
};

/** Exibe upload/link/título quando Sim exige comprovação (salvo ou em seleção local). */
export function shouldShowEvidenceUI(
  row: WorkbenchRow,
  options?: { pendingYes?: boolean },
): boolean {
  if (!row.requiresEvidence) return false;
  return row.answer === "yes" || options?.pendingYes === true;
}

function evidenceStatusHint(
  row: WorkbenchRow,
  pendingYes?: boolean,
): { tone: "neutral" | "amber" | "emerald" | "rose"; text: string } | null {
  if (!shouldShowEvidenceUI(row, { pendingYes })) return null;
  const v = row.validationStatus;
  if (v === "complementation_requested") {
    return { tone: "amber", text: "Foi solicitada complementacao da evidencia." };
  }
  if (v === "valid" || v === "waived" || v === "partially_valid") {
    return { tone: "emerald", text: "Evidencia em ordem (validada ou em analise)." };
  }
  if (v === "invalid") {
    return { tone: "rose", text: "A evidencia nao foi aceita. Envie outro arquivo ou ajuste o link." };
  }
  if (v === "pending" || v === null) {
    if (row.evidenceId || row.storagePath || row.externalLink) {
      return { tone: "neutral", text: "Evidencia recebida; aguardando validacao do analista." };
    }
    return {
      tone: "neutral",
      text: "Anexe um arquivo ou informe um link com titulo e clique em Sim novamente para salvar.",
    };
  }
  return {
    tone: "neutral",
    text: "Anexe um arquivo ou informe um link com titulo e clique em Sim novamente para salvar.",
  };
}

const STATUS_TONE_CLASS: Record<
  NonNullable<ReturnType<typeof evidenceStatusHint>>["tone"],
  string
> = {
  neutral: "text-slate-600",
  amber: "text-amber-900",
  emerald: "text-emerald-800",
  rose: "text-rose-800",
};

const ANSWER_OPTIONS: { value: "yes" | "no" | "partial"; label: string }[] = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Nao" },
  { value: "partial", label: "Parcialmente" },
];

function answerOptionsForRow(row: WorkbenchRow) {
  if (workbenchRowAllowsPartial(row)) return ANSWER_OPTIONS;
  return ANSWER_OPTIONS.filter((o) => o.value !== "partial");
}

function axisLabelForSection(rows: WorkbenchRow[]): string | null {
  const axes = new Set(rows.map((r) => r.axisName).filter(Boolean));
  if (axes.size === 1) return [...axes][0] ?? null;
  return null;
}

/** Enviar Sim com pergunta que exige evidencia: comprovante + titulo obrigatorios. */
export function canSubmitYesWithEvidence(row: WorkbenchRow, draft: EvidenceDraft): boolean {
  if (!row.requiresEvidence) return true;
  return validateYesWithEvidence(
    {
      kind: draft.kind,
      title: draft.title,
      storagePath: draft.storagePath,
      externalLink: draft.externalLink,
    },
    {
      kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
      title: row.evidenceTitle,
      storagePath: row.storagePath,
      externalLink: row.externalLink,
    },
  ).ok;
}

export function validateYesWithEvidenceForRow(
  row: WorkbenchRow,
  draft: EvidenceDraft,
): YesEvidenceFieldErrors {
  if (!row.requiresEvidence) return {};
  return validateYesWithEvidence(
    {
      kind: draft.kind,
      title: draft.title,
      storagePath: draft.storagePath,
      externalLink: draft.externalLink,
    },
    {
      kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
      title: row.evidenceTitle,
      storagePath: row.storagePath,
      externalLink: row.externalLink,
    },
  ).errors;
}

/** Há arquivo, link ou registro salvo que o respondente pode remover. */
export function canRemoveEvidenceAttachment(row: WorkbenchRow, draft: EvidenceDraft): boolean {
  if (draft.kind === "file" && draft.storagePath) return true;
  if (draft.kind === "link" && (draft.externalLink.trim() !== "" || row.evidenceId)) return true;
  if (row.evidenceId && (row.storagePath || row.externalLink)) return true;
  return false;
}

type SectionQuestionsProps = {
  section: RespondentSectionGroup;
  sectionIndex: number;
  sectionTotal: number;
  /** Ex.: "Etapa 1 de 3" — integrado ao cabeçalho da seção. */
  stepLabel: string;
  /** 0–100: avanço pelas etapas do formulário. */
  stepProgressPct: number;
  evidenceDrafts: Record<string, EvidenceDraft>;
  onEvidenceDraftChange: (questionId: string, patch: Partial<EvidenceDraft>) => void;
  onFileSelected: (row: WorkbenchRow, file: File) => void;
  onRemoveAttachment?: (row: WorkbenchRow) => void | Promise<void>;
  onSelectAnswer: (row: WorkbenchRow, value: "yes" | "no" | "partial") => void;
  disabled?: boolean;
  activeQuestionId?: string | null;
  uploadingQuestionId?: string | null;
  pendingYesQuestionIds?: ReadonlySet<string>;
  evidenceFieldErrors?: Record<string, YesEvidenceFieldErrors>;
};

/** Perguntas de uma única seção (usado pelo wizard de etapas). */
export function RespondentSectionQuestions({
  section,
  sectionIndex,
  sectionTotal,
  stepLabel,
  stepProgressPct,
  evidenceDrafts,
  onEvidenceDraftChange,
  onFileSelected,
  onRemoveAttachment,
  onSelectAnswer,
  disabled,
  activeQuestionId,
  uploadingQuestionId,
  pendingYesQuestionIds,
  evidenceFieldErrors,
}: SectionQuestionsProps) {
  const ws = formSurface.formWorkspace;
  const sectionAxis = axisLabelForSection(section.rows);
  const sectionId = `section-${sectionIndex}-${section.name.replace(/\s+/g, "-")}`;

  return (
    <section key={sectionId} aria-labelledby={sectionId} className="scroll-mt-8">
      <header className={ws.sectionHeader}>
        <div className="space-y-3">
          <div className={ws.sectionStepRow}>
            <span className={ws.sectionStepKicker}>{stepLabel}</span>
          </div>
          <div
            className={ws.sectionProgressTrack}
            role="progressbar"
            aria-valuenow={stepProgressPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progresso do formulário: ${stepLabel}`}
          >
            <div
              className={ws.sectionProgressFill}
              style={{ width: `${stepProgressPct}%` }}
            />
          </div>
        </div>
        <div>
          <h2 id={sectionId} className={ws.sectionTitle}>
            {section.name}
          </h2>
          {sectionAxis ? <p className="mt-1.5 text-sm text-slate-500">{sectionAxis}</p> : null}
        </div>
      </header>

      <ol className={ws.questionsList}>
        {section.rows.map((row, index) => {
                const draft: EvidenceDraft =
                  evidenceDrafts[row.questionId] ??
                  ({
                    kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
                    title: row.evidenceTitle ?? "",
                    description: row.evidenceDescription ?? "",
                    externalLink: row.externalLink ?? "",
                    storagePath: row.storagePath ?? null,
                  } satisfies EvidenceDraft);
                const pendingYes = pendingYesQuestionIds?.has(row.questionId) ?? false;
                const fieldErrors = evidenceFieldErrors?.[row.questionId];
                const showEvidence = shouldShowEvidenceUI(row, { pendingYes });
                const ev = evidenceStatusHint(row, pendingYes);
                const isBusy = activeQuestionId === row.questionId;
                const isUploading = uploadingQuestionId === row.questionId;
                const answerOptions = answerOptionsForRow(row);
                const choiceCols =
                  answerOptions.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2";

                return (
                  <li key={row.questionId} className={ws.questionCard}>
                    <div className="space-y-3">
                      <p className={typography.meta}>
                        Pergunta {index + 1}
                        {!sectionAxis && row.axisName ? (
                          <>
                            <span className="mx-1.5 text-slate-300" aria-hidden>
                              ·
                            </span>
                            {row.axisName}
                          </>
                        ) : null}
                      </p>

                      <p className={ws.questionPrompt}>{row.prompt}</p>
                      {row.requiresEvidence ? (
                        <p className="flex items-start gap-2 text-sm leading-snug text-slate-600">
                          <Paperclip
                            className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
                            aria-hidden
                          />
                          <span>
                            Esta pergunta exige comprovação. Se você responder{" "}
                            <span className="font-medium text-slate-800">Sim</span>, anexe um
                            arquivo ou informe um link com título na seção abaixo.
                          </span>
                        </p>
                      ) : null}
                    </div>

                    <fieldset className="mt-5">
                      <legend className="sr-only">Sua resposta</legend>
                      <div
                        className={`grid grid-cols-1 gap-2 ${choiceCols}`}
                        role="group"
                        aria-label={`Resposta: ${row.prompt.slice(0, 80)}`}
                      >
                        {answerOptions.map((opt) => {
                          const selected = row.answer === opt.value;
                          return (
                            <button
                              key={opt.value}
                              type="button"
                              disabled={Boolean(disabled || isBusy)}
                              aria-pressed={selected}
                              onClick={() => onSelectAnswer(row, opt.value)}
                              className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand ${
                                selected
                                  ? "border-brand-400 bg-brand-50 text-brand-900 shadow-sm"
                                  : "border-slate-200/90 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50/90"
                              } ${disabled || isBusy ? "cursor-wait opacity-60" : ""}`}
                            >
                              {selected ? (
                                <Check className="h-4 w-4 text-brand-600" aria-hidden />
                              ) : null}
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                      {isBusy ? (
                        <p className="mt-2 text-xs font-medium text-brand-700">Salvando…</p>
                      ) : null}
                    </fieldset>

                    {showEvidence ? (
                      <div className="mt-5 space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
                        {ev ? (
                          <p
                            className={`flex items-start gap-2 text-sm leading-snug ${STATUS_TONE_CLASS[ev.tone]}`}
                          >
                            {ev.tone === "emerald" ? (
                              <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            ) : ev.tone === "amber" || ev.tone === "rose" ? (
                              <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                            ) : (
                              <AlertCircle
                                className="mt-0.5 h-4 w-4 shrink-0 opacity-70"
                                aria-hidden
                              />
                            )}
                            <span>{ev.text}</span>
                          </p>
                        ) : null}

                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            <Paperclip
                              className="mr-1.5 inline h-4 w-4 -translate-y-px text-slate-400"
                              aria-hidden
                            />
                            Comprovante
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            Envie um arquivo ou informe um link com titulo.
                          </p>
                        </div>

                        <div className="space-y-3">
                          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                            Arquivo ou link
                          </p>
                          {fieldErrors?.attachment ? (
                            <p className="text-sm text-rose-600" role="alert">
                              {fieldErrors.attachment}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <label className={`${formSurface.secondaryButtonSm} cursor-pointer`}>
                              <Upload className="h-4 w-4 text-slate-500" aria-hidden />
                              <span>{isUploading ? "Enviando…" : "Enviar arquivo"}</span>
                              <input
                                type="file"
                                className="sr-only"
                                disabled={Boolean(disabled || isBusy || isUploading)}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) onFileSelected(row, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                            <span className="text-xs text-slate-400">ou</span>
                            <button
                              type="button"
                              onClick={() =>
                                onEvidenceDraftChange(row.questionId, {
                                  kind: "link",
                                  storagePath: null,
                                  externalLink: draft.externalLink,
                                })
                              }
                              className={`${formSurface.secondaryButtonSm} ${
                                draft.kind === "link"
                                  ? "border-brand-300 bg-brand-50 text-brand-800"
                                  : ""
                              }`}
                            >
                              <Link2 className="h-4 w-4 text-slate-500" aria-hidden />
                              Informar link
                            </button>
                          </div>

                          {draft.kind === "file" && draft.storagePath ? (
                            <div className="flex flex-col gap-2 rounded-lg border border-emerald-100 bg-emerald-50/50 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between">
                              <p className="text-xs leading-snug text-emerald-900">
                                <span className="font-medium">Arquivo enviado</span>
                              </p>
                              {onRemoveAttachment && canRemoveEvidenceAttachment(row, draft) ? (
                                <button
                                  type="button"
                                  onClick={() => void onRemoveAttachment(row)}
                                  disabled={Boolean(disabled || isBusy || isUploading)}
                                  className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                  Remover
                                </button>
                              ) : null}
                            </div>
                          ) : null}

                          {draft.kind === "link" ? (
                            <div className={formSurface.fieldGroup}>
                              <label
                                htmlFor={`ev-link-${row.questionId}`}
                                className={formSurface.label}
                              >
                                URL <span className="text-rose-600">*</span>
                              </label>
                              <input
                                id={`ev-link-${row.questionId}`}
                                type="url"
                                value={draft.externalLink}
                                onChange={(e) =>
                                  onEvidenceDraftChange(row.questionId, {
                                    externalLink: e.target.value,
                                  })
                                }
                                disabled={Boolean(disabled || isBusy)}
                                placeholder="https://..."
                                className={`${formSurface.input} ${
                                  fieldErrors?.attachment ? "border-rose-400 ring-1 ring-rose-200" : ""
                                }`}
                                aria-invalid={fieldErrors?.attachment ? true : undefined}
                              />
                              {onRemoveAttachment && canRemoveEvidenceAttachment(row, draft) ? (
                                <div className="flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => void onRemoveAttachment(row)}
                                    disabled={Boolean(disabled || isBusy || isUploading)}
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-700 hover:text-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                                    Remover link
                                  </button>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>

                        <div className="space-y-3">
                          <div className={formSurface.fieldGroup}>
                            <label
                              htmlFor={`ev-title-${row.questionId}`}
                              className={formSurface.label}
                            >
                              Titulo da evidencia <span className="text-rose-600">*</span>
                            </label>
                            <input
                              id={`ev-title-${row.questionId}`}
                              type="text"
                              value={draft.title}
                              onChange={(e) =>
                                onEvidenceDraftChange(row.questionId, { title: e.target.value })
                              }
                              disabled={Boolean(disabled || isBusy)}
                              maxLength={500}
                              placeholder="Ex.: Politica de integridade aprovada – 2026"
                              className={`${formSurface.input} ${
                                fieldErrors?.title ? "border-rose-400 ring-1 ring-rose-200" : ""
                              }`}
                              aria-invalid={fieldErrors?.title ? true : undefined}
                              aria-describedby={
                                fieldErrors?.title ? `ev-title-error-${row.questionId}` : undefined
                              }
                            />
                            {fieldErrors?.title ? (
                              <p
                                id={`ev-title-error-${row.questionId}`}
                                className="text-sm text-rose-600"
                                role="alert"
                              >
                                {fieldErrors.title}
                              </p>
                            ) : null}
                          </div>
                          <div className={formSurface.fieldGroup}>
                            <label
                              htmlFor={`ev-desc-${row.questionId}`}
                              className={formSurface.label}
                            >
                              Descricao (opcional)
                            </label>
                            <textarea
                              id={`ev-desc-${row.questionId}`}
                              value={draft.description}
                              onChange={(e) =>
                                onEvidenceDraftChange(row.questionId, {
                                  description: e.target.value,
                                })
                              }
                              disabled={Boolean(disabled || isBusy)}
                              rows={2}
                              maxLength={4000}
                              placeholder="Observacoes, pagina relevante, periodo…"
                              className={formSurface.inputTextarea}
                            />
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
      </ol>
    </section>
  );
}

