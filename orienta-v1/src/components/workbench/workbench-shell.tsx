"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, RefreshCw, SendHorizontal } from "lucide-react";
import { getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import { RespondentSectionWizard } from "@/components/respondente/respondent-section-wizard";
import {
  fetchWorkbenchData,
  removeEvidenceAttachment,
  submitRespondentForm,
  submitWorkbenchResponse,
  uploadEvidenceFile,
  type WorkbenchEvidencePayload,
} from "@/lib/client/workbench-api";
import {
  type WorkbenchRow,
} from "@/lib/workbench/load-workbench-payload";
import type { EvidenceDraft } from "@/components/respondente/respondent-question-panel";
import {
  canSubmitYesWithEvidence,
  validateYesWithEvidenceForRow,
} from "@/components/respondente/respondent-question-panel";
import {
  formatYesEvidenceErrors,
  type YesEvidenceFieldErrors,
} from "@/lib/workbench/validate-yes-evidence";
import { formSurface } from "@/lib/layout/form-surface";
import { invalidateRespondentOverviewCache } from "@/lib/hooks/respondent-overview-cache";
import {
  formatSubmitRecommendationMessage,
  notifyRespondentReprocessOutcome,
  portfolioPendingLink,
} from "@/lib/recommendations/post-save-feedback";
import { describeError, notify } from "@/lib/notify";
import { draftFromRow, sectionStorageKey } from "@/lib/workbench/section-progress";

type Mode = "respondent";
type Row = WorkbenchRow;

type WorkbenchPayload = {
  form: {
    id: string;
    name: string;
    version: number;
    state: string;
    responseDeadlineAt?: string | null;
    closedAt?: string | null;
  };
  rows: Row[];
};

function formatDeadline(iso: string | null | undefined): string | null {
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

/** Mensagens de rotina no fluxo por etapas  no exibir faixa no topo. */
function isRoutineWorkbenchMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("salva") ||
    m.includes("removido") ||
    m.includes("registrad") ||
    m.includes("carregando quest�es") ||
    m.includes("ultima se��o") ||
    m.includes("continue no pr�ximo") ||
    m.includes("revise o resumo")
  );
}

export function WorkbenchShell({
  mode,
  useSessionContext = true,
  initialFormId,
  lockedOrganizationId,
  lockedOrganizationName,
  /** Se true, busca as quest�es ao abrir a tela (fluxo "Responder" do respondente). */
  autoLoad = false,
  /** Quando informado, exibe um dropdown de formul�rios em vez do campo de UUID livre. */
  availableForms,
}: {
  mode: Mode;
  /** Se true, usa rotas /api/workbench/* com cookie de sessao (producao). */
  useSessionContext?: boolean;
  initialFormId?: string;
  /** Quando preenchido com sessao, org vem do perfil (evita troca acidental). */
  lockedOrganizationId?: string;
  lockedOrganizationName?: string;
  autoLoad?: boolean;
  availableForms?: { id: string; name: string }[];
}) {
  const runtime = getRuntimeDefaults();
  const [ids, setIds] = useState(() => ({
    formId: initialFormId ?? runtime.formId,
    organizationId: lockedOrganizationId ?? runtime.organizationId,
    respondentUserId: runtime.respondentUserId,
    staffUserId: runtime.adminUserId,
  }));
  const canAutoLoad = Boolean(
    autoLoad && (initialFormId ?? runtime.formId) && (lockedOrganizationId ?? runtime.organizationId),
  );
  const [data, setData] = useState<WorkbenchPayload | null>(null);
  const [message, setMessage] = useState(() =>
    canAutoLoad ? "Carregando quest�es..." : "Carregue o formul�rio para iniciar.",
  );
  const [loading, setLoading] = useState(() => canAutoLoad);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, EvidenceDraft>>({});
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<{ recommendationsCreated: number } | null>(
    null,
  );
  /** Sim escolhido antes de anexar evid�ncia (ainda n�o persistido). */
  const [pendingYesQuestionIds, setPendingYesQuestionIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [evidenceFieldErrors, setEvidenceFieldErrors] = useState<
    Record<string, YesEvidenceFieldErrors>
  >({});
  const hasLoadedWorkbenchRef = useRef(false);
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [stepDirection, setStepDirection] = useState<"forward" | "back">("forward");
  const [advancingSection, setAdvancingSection] = useState(false);

  function emptyEvidenceDraft(): EvidenceDraft {
    return { kind: null, title: "", description: "", externalLink: "", storagePath: null };
  }

  const updateEvidenceDraft = useCallback((questionId: string, patch: Partial<EvidenceDraft>) => {
    setEvidenceDrafts((p) => ({
      ...p,
      [questionId]: { ...(p[questionId] ?? emptyEvidenceDraft()), ...patch },
    }));
  }, []);

  // Sincroniza evidenceDrafts com os rows carregados pela API.
  useEffect(() => {
    if (!data?.rows) return;
    setEvidenceDrafts(() => {
      const m: Record<string, EvidenceDraft> = {};
      for (const row of data.rows) {
        m[row.questionId] = {
          kind: row.storagePath ? "file" : row.externalLink ? "link" : null,
          title: row.evidenceTitle ?? "",
          description: row.evidenceDescription ?? "",
          externalLink: row.externalLink ?? "",
          storagePath: row.storagePath ?? null,
        };
      }
      return m;
    });
  }, [data]);

  useEffect(() => {
    if (!data?.rows) return;
    setPendingYesQuestionIds((prev) => {
      const next = new Set(prev);
      for (const row of data.rows) {
        if (row.answer) next.delete(row.questionId);
      }
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  const rawRows = data?.rows;
  const displayRows = useMemo<Row[]>(() => {
    if (!rawRows) return [];
    return rawRows.map((row) => {
      if (pendingYesQuestionIds.has(row.questionId) && row.answer !== "yes") {
        return { ...row, answer: "yes" };
      }
      return row;
    });
  }, [rawRows, pendingYesQuestionIds]);

  const orgLocked = Boolean(useSessionContext && lockedOrganizationId);
  const simplifiedRespondent = Boolean(
    autoLoad && useSessionContext && orgLocked && mode === "respondent",
  );

  const groupedBySection = useMemo(() => {
    const sections: { name: string; rows: Row[] }[] = [];
    const indexByName = new Map<string, number>();
    for (const row of displayRows) {
      const name = row.sectionName?.trim() || "Geral";
      let idx = indexByName.get(name);
      if (idx === undefined) {
        idx = sections.length;
        indexByName.set(name, idx);
        sections.push({ name, rows: [] });
      }
      sections[idx].rows.push(row);
    }
    return sections;
  }, [displayRows]);

  const role = "respondent" as const;

  const loadWorkbench = useCallback(async () => {
    const isRefresh = hasLoadedWorkbenchRef.current;
    if (!isRefresh) {
      setLoading(true);
    }
    if (simplifiedRespondent && isRefresh) {
      setMessage("");
    } else if (!isRefresh) {
      setMessage("Carregando quest�es...");
    }
    const response = await fetchWorkbenchData(ids, role, useSessionContext);
    const payload = await response.json();
    setLoading(false);
    if (!response.ok) {
      const errorMessage =
        typeof payload.error === "string"
          ? payload.error
          : (payload.error as { message?: string } | undefined)?.message ?? "Falha ao carregar dados.";
      setMessage(errorMessage);
      notify.error(errorMessage);
      return;
    }
    setData(payload);
    hasLoadedWorkbenchRef.current = true;
    if (!simplifiedRespondent) {
      setMessage("Pronto. Responda as quest�es abaixo; use Atualizar se precisar recarregar.");
    }
  }, [ids, role, useSessionContext, simplifiedRespondent]);

  useEffect(() => {
    hasLoadedWorkbenchRef.current = false;
    setCurrentSectionIndex(0);
    setStepDirection("forward");
  }, [ids.formId, ids.organizationId]);

  useEffect(() => {
    if (canAutoLoad) void loadWorkbench();
  }, [canAutoLoad, loadWorkbench]);

  async function handleRemoveEvidence(row: Row) {
    if (!window.confirm("Remover anexo ou link desta evid�ncia?")) return;
    const draft = evidenceDrafts[row.questionId] ?? emptyEvidenceDraft();
    const hasPersistedEvidence = Boolean(row.evidenceId);
    const isLinkOnlyDraft =
      draft.kind === "link" && draft.externalLink?.trim() && !hasPersistedEvidence;

    if (isLinkOnlyDraft) {
      updateEvidenceDraft(row.questionId, {
        kind: null,
        storagePath: null,
        externalLink: "",
        title: "",
        description: "",
      });
      setMessage("Link removido.");
      return;
    }

    const isFileDraftOnly =
      draft.kind === "file" && Boolean(draft.storagePath) && !hasPersistedEvidence;

    setSavingQuestionId(row.questionId);
    setMessage("");
    try {
      const res = await removeEvidenceAttachment(
        ids,
        {
          questionId: row.questionId,
          draftStoragePath: isFileDraftOnly ? draft.storagePath : undefined,
        },
        useSessionContext,
      );
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setMessage(typeof body.error === "string" ? body.error : "Falha ao remover anexo.");
        return;
      }
      setEvidenceDrafts((p) => ({
        ...p,
        [row.questionId]: emptyEvidenceDraft(),
      }));
      await loadWorkbench();
      setMessage("Anexo removido.");
    } finally {
      setSavingQuestionId(null);
    }
  }

  async function handleEvidenceFile(row: Row, file: File) {
    setUploadingQuestionId(row.questionId);
    setMessage("");
    try {
      const res = await uploadEvidenceFile(ids, file, useSessionContext);
      const body = (await res.json()) as { error?: string; storagePath?: string };
      if (!res.ok) {
        setMessage(typeof body.error === "string" ? body.error : "Falha no upload.");
        return;
      }
      setEvidenceDrafts((p) => ({
        ...p,
        [row.questionId]: {
          ...(p[row.questionId] ?? emptyEvidenceDraft()),
          kind: "file",
          storagePath: body.storagePath ?? null,
          title: p[row.questionId]?.title?.trim() || file.name.replace(/\.[^.]+$/, "") || "Evid�ncia",
        },
      }));
    } finally {
      setUploadingQuestionId(null);
    }
  }

  function applyYesEvidenceValidation(row: Row, draft: EvidenceDraft): boolean {
    const errors = validateYesWithEvidenceForRow(row, draft);
    if (Object.keys(errors).length === 0) {
      setEvidenceFieldErrors((prev) => {
        if (!prev[row.questionId]) return prev;
        const next = { ...prev };
        delete next[row.questionId];
        return next;
      });
      return true;
    }
    setPendingYesQuestionIds((prev) => new Set(prev).add(row.questionId));
    setEvidenceFieldErrors((prev) => ({ ...prev, [row.questionId]: errors }));
    setMessage(formatYesEvidenceErrors(errors));
    return false;
  }

  async function handleSelectAnswer(row: Row, answer: "yes" | "no" | "not_applicable") {
    if (answer !== "yes") {
      setPendingYesQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(row.questionId);
        return next;
      });
      setEvidenceFieldErrors((prev) => {
        if (!prev[row.questionId]) return prev;
        const next = { ...prev };
        delete next[row.questionId];
        return next;
      });
      await saveResponse(row, answer);
      return;
    }

    if (row.requiresEvidence) {
      const draft = evidenceDrafts[row.questionId] ?? emptyEvidenceDraft();
      if (!applyYesEvidenceValidation(row, draft)) return;
    }

    setPendingYesQuestionIds((prev) => {
      const next = new Set(prev);
      next.delete(row.questionId);
      return next;
    });
    await saveResponse(row, answer);
  }

  async function saveResponse(
    row: Row,
    answer: "yes" | "no" | "not_applicable",
    options?: { silent?: boolean },
  ) {
    const draft = evidenceDrafts[row.questionId] ?? emptyEvidenceDraft();
    if (answer === "yes" && row.requiresEvidence) {
      if (!applyYesEvidenceValidation(row, draft)) return;
    }

    let evidence: WorkbenchEvidencePayload | undefined;
    if (answer === "yes" && row.requiresEvidence) {
      if (draft.kind === "file" && draft.storagePath && draft.title.trim()) {
        evidence = {
          kind: "file",
          title: draft.title.trim(),
          description: draft.description || undefined,
          storagePath: draft.storagePath,
        };
      } else if (draft.kind === "link" && draft.externalLink?.trim() && draft.title.trim()) {
        evidence = {
          kind: "link",
          title: draft.title.trim(),
          description: draft.description || undefined,
          externalLink: draft.externalLink.trim(),
        };
      } else if (canSubmitYesWithEvidence(row, draft)) {
        // Evid�ncia ja persistida no servidor; resposta Sim sem payload novo.
        evidence = undefined;
      } else {
        applyYesEvidenceValidation(row, draft);
        return;
      }
    }

    setSavingQuestionId(row.questionId);
    setMessage("");
    try {
      const response = await submitWorkbenchResponse(
        ids,
        {
          questionId: row.questionId,
          answer,
          notes: row.notes ?? "",
          evidence,
        },
        useSessionContext,
      );
      const payload = (await response.json()) as {
        error?: string;
        fields?: YesEvidenceFieldErrors;
        famiReprocess?: {
          recommendationsCreated?: number;
          recommendationsUpdated?: number;
        } | null;
      };
      if (!response.ok) {
        if (answer === "yes" && row.requiresEvidence && payload.fields) {
          setPendingYesQuestionIds((prev) => new Set(prev).add(row.questionId));
          setEvidenceFieldErrors((prev) => ({ ...prev, [row.questionId]: payload.fields! }));
        }
        setMessage(
          typeof payload.error === "string" ? payload.error : "Falha ao salvar a resposta. Tente novamente.",
        );
        return;
      }
      setEvidenceFieldErrors((prev) => {
        if (!prev[row.questionId]) return prev;
        const next = { ...prev };
        delete next[row.questionId];
        return next;
      });
      await loadWorkbench();
      if (mode === "respondent") {
        invalidateRespondentOverviewCache();
      }
      if (simplifiedRespondent) {
        notifyRespondentReprocessOutcome(ids.formId, payload.famiReprocess, {
          answer,
          requiresEvidence: row.requiresEvidence,
        });
        setMessage("");
      } else if (!options?.silent) {
        setMessage("Resposta salva.");
      }
    } finally {
      setSavingQuestionId(null);
    }
  }

  useEffect(() => {
    if (!simplifiedRespondent || !ids.formId || !ids.organizationId) return;
    if (groupedBySection.length === 0) return;
    try {
      const raw = localStorage.getItem(sectionStorageKey(ids.formId, ids.organizationId));
      if (raw == null) return;
      const idx = Number.parseInt(raw, 10);
      if (Number.isFinite(idx)) {
        setCurrentSectionIndex(Math.min(Math.max(0, idx), groupedBySection.length - 1));
      }
    } catch {
      /* ignore */
    }
  }, [simplifiedRespondent, ids.formId, ids.organizationId, groupedBySection.length]);

  useEffect(() => {
    if (!simplifiedRespondent || !ids.formId || !ids.organizationId) return;
    if (groupedBySection.length === 0) return;
    try {
      localStorage.setItem(
        sectionStorageKey(ids.formId, ids.organizationId),
        String(currentSectionIndex),
      );
    } catch {
      /* ignore */
    }
  }, [
    simplifiedRespondent,
    ids.formId,
    ids.organizationId,
    currentSectionIndex,
    groupedBySection.length,
  ]);

  useEffect(() => {
    if (currentSectionIndex >= groupedBySection.length && groupedBySection.length > 0) {
      setCurrentSectionIndex(groupedBySection.length - 1);
    }
  }, [currentSectionIndex, groupedBySection.length]);

  async function validateAndFlushCurrentSection(sectionIndex: number): Promise<boolean> {
    const section = groupedBySection[sectionIndex];
    if (!section) return true;

    const missingAnswer: string[] = [];
    const missingEvidence: string[] = [];
    const nextFieldErrors: Record<string, YesEvidenceFieldErrors> = {};
    const pendingEvidenceIds = new Set<string>();

    for (const row of section.rows) {
      const draft = evidenceDrafts[row.questionId] ?? draftFromRow(row);
      const pendingYes = pendingYesQuestionIds.has(row.questionId);

      if (pendingYes) {
        if (row.requiresEvidence && !applyYesEvidenceValidation(row, draft as EvidenceDraft)) {
          missingEvidence.push(row.prompt);
          nextFieldErrors[row.questionId] = validateYesWithEvidenceForRow(row, draft as EvidenceDraft);
          pendingEvidenceIds.add(row.questionId);
          continue;
        }
        await saveResponse(row, "yes", { silent: true });
        continue;
      }

      if (!row.answer) {
        missingAnswer.push(row.prompt);
        continue;
      }

      if (row.answer === "yes" && row.requiresEvidence) {
        if (!canSubmitYesWithEvidence(row, draft as EvidenceDraft)) {
          missingEvidence.push(row.prompt);
          nextFieldErrors[row.questionId] = validateYesWithEvidenceForRow(row, draft as EvidenceDraft);
          pendingEvidenceIds.add(row.questionId);
        }
      }
    }

    const totalPending = missingAnswer.length + missingEvidence.length;
    if (totalPending > 0) {
      if (Object.keys(nextFieldErrors).length > 0) {
        setEvidenceFieldErrors((prev) => ({ ...prev, ...nextFieldErrors }));
        setPendingYesQuestionIds((prev) => {
          const next = new Set(prev);
          for (const id of pendingEvidenceIds) next.add(id);
          return next;
        });
      }
      const parts: string[] = [];
      if (missingAnswer.length > 0) {
        parts.push(`${missingAnswer.length} sem resposta`);
      }
      if (missingEvidence.length > 0) {
        parts.push(`${missingEvidence.length} com evid�ncia pendente`);
      }
      notify.warning(`Conclua esta se��o antes de continuar.`, {
        description: parts.join(" \u2022 "),
        duration: 7000,
      });
      return false;
    }

    return true;
  }

  async function handleSectionContinue() {
    if (advancingSection || savingQuestionId || uploadingQuestionId) return;
    const isLast = currentSectionIndex >= groupedBySection.length - 1;
    setAdvancingSection(true);
    setMessage("");
    try {
      const ok = await validateAndFlushCurrentSection(currentSectionIndex);
      if (!ok) return;
      if (isLast) {
        setMessage("");
        return;
      }
      setStepDirection("forward");
      setCurrentSectionIndex((i) => Math.min(i + 1, groupedBySection.length - 1));
      setMessage("");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setAdvancingSection(false);
    }
  }

  function handleSectionBack() {
    if (currentSectionIndex <= 0 || advancingSection) return;
    setStepDirection("back");
    setCurrentSectionIndex((i) => Math.max(0, i - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmitForm() {
    if (!data?.rows?.length) return;
    const rows = data.rows;
    const missingAnswer: string[] = [];
    const missingEvidence: string[] = [];
    const nextFieldErrors: Record<string, YesEvidenceFieldErrors> = {};
    const pendingEvidenceIds = new Set<string>();
    for (const row of rows) {
      if (!row.answer) {
        missingAnswer.push(row.prompt);
        continue;
      }
      if (row.answer === "yes" && row.requiresEvidence) {
        const draft = evidenceDrafts[row.questionId] ?? emptyEvidenceDraft();
        if (!canSubmitYesWithEvidence(row, draft)) {
          missingEvidence.push(row.prompt);
          nextFieldErrors[row.questionId] = validateYesWithEvidenceForRow(row, draft);
          pendingEvidenceIds.add(row.questionId);
        }
      }
    }
    const totalPending = missingAnswer.length + missingEvidence.length;
    if (totalPending > 0) {
      if (Object.keys(nextFieldErrors).length > 0) {
        setEvidenceFieldErrors((prev) => ({ ...prev, ...nextFieldErrors }));
        setPendingYesQuestionIds((prev) => {
          const next = new Set(prev);
          for (const id of pendingEvidenceIds) next.add(id);
          return next;
        });
      }
      const parts: string[] = [];
      if (missingAnswer.length > 0) {
        parts.push(`${missingAnswer.length} sem resposta`);
      }
      if (missingEvidence.length > 0) {
        parts.push(`${missingEvidence.length} com evid�ncia pendente`);
      }
      notify.warning(
        `Faltam ${totalPending} pergunta(s) para concluir o formul�rio.`,
        { description: parts.join(" \u2022 "), duration: 8000 },
      );
      return;
    }

    if (mode !== "respondent") {
      notify.success("Formul�rio completo: todas as respostas ja estao salvas.");
      return;
    }

    setSubmittingForm(true);
    setSubmitSummary(null);
    const loadingId = notify.loading("Finalizando envio e gerando recomenda��es�");
    try {
      const response = await submitRespondentForm(ids, useSessionContext);
      const payload = (await response.json()) as {
        error?: string;
        recommendationsCreated?: number;
      };
      if (!response.ok) {
        notify.error(
          typeof payload.error === "string"
            ? payload.error
            : "Falha ao finalizar o envio. Tente novamente.",
          { id: loadingId },
        );
        return;
      }
      const created = payload.recommendationsCreated ?? 0;
      setSubmitSummary({ recommendationsCreated: created });
      invalidateRespondentOverviewCache();
      notify.success(formatSubmitRecommendationMessage(created), { id: loadingId });
    } catch (e: unknown) {
      notify.error(describeError(e, "Falha ao finalizar o envio. Tente novamente."), {
        id: loadingId,
      });
    } finally {
      setSubmittingForm(false);
    }
  }

  if (simplifiedRespondent) {
    const showAlertMessage =
      Boolean(message) && !isRoutineWorkbenchMessage(message) && !(loading && !data);
    const sectionCount = groupedBySection.length;
    const isLastSection = currentSectionIndex >= sectionCount - 1;
    const navBusy = Boolean(
      advancingSection || savingQuestionId || uploadingQuestionId || submittingForm,
    );
    const ws = formSurface.formWorkspace;

    return (
      <>
        <div className={ws.body}>
          {showAlertMessage ? (
            <div role="alert" className={formSurface.messageError}>
              {message}
            </div>
          ) : null}
          {loading && !data ? (
            <div className="space-y-6" aria-hidden>
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3 animate-pulse">
                  <div className="h-3 w-1/4 rounded bg-slate-200" />
                  <div className="h-4 w-full max-w-lg rounded bg-slate-200" />
                  <div className="h-10 w-full max-w-sm rounded-lg bg-slate-200" />
                </div>
              ))}
            </div>
          ) : null}
          {data && (data.rows?.length ?? 0) === 0 && !loading ? (
            <p className="text-center text-sm text-slate-500">N�o ha quest�es vinculadas a este formul�rio.</p>
          ) : null}
          {data && (data.rows?.length ?? 0) > 0 ? (
            <RespondentSectionWizard
              groupedBySection={groupedBySection}
              currentSectionIndex={currentSectionIndex}
              stepDirection={stepDirection}
              evidenceDrafts={evidenceDrafts}
              onEvidenceDraftChange={updateEvidenceDraft}
              onFileSelected={handleEvidenceFile}
              onRemoveAttachment={handleRemoveEvidence}
              onSelectAnswer={handleSelectAnswer}
              disabled={loading || advancingSection}
              activeQuestionId={savingQuestionId}
              uploadingQuestionId={uploadingQuestionId}
              pendingYesQuestionIds={pendingYesQuestionIds}
              evidenceFieldErrors={evidenceFieldErrors}
            />
          ) : null}
        </div>
        {data && (data.rows?.length ?? 0) > 0 ? (
          <div className={`${ws.footer} flex flex-col gap-3`}>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSectionBack}
                  disabled={currentSectionIndex <= 0 || navBusy}
                  className={`${formSurface.secondaryButton} inline-flex items-center justify-center gap-2 sm:min-w-35`}
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden />
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => void loadWorkbench()}
                  disabled={loading || navBusy}
                  className={formSurface.ghostButton}
                  title="Atualizar perguntas"
                  aria-label="Atualizar perguntas"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
                  Atualizar
                </button>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                {!isLastSection ? (
                  <button
                    type="button"
                    onClick={() => void handleSectionContinue()}
                    disabled={navBusy}
                    className={`${formSurface.primaryButton} inline-flex items-center justify-center gap-2 sm:min-w-45`}
                  >
                    {advancingSection ? "Salvando��" : "Continuar"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSectionContinue()}
                      disabled={navBusy}
                      className={`${formSurface.secondaryButton} inline-flex items-center justify-center gap-2 sm:min-w-40`}
                    >
                      {advancingSection ? "Salvando��" : "Concluir se��o"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmitForm()}
                      disabled={navBusy}
                      className={`${formSurface.primaryButton} inline-flex items-center justify-center gap-2 sm:min-w-50`}
                    >
                      <SendHorizontal className="h-4 w-4" aria-hidden />
                      {submittingForm ? "Finalizando�" : "Finalizar envio"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {submitSummary ? (
              <div className={formSurface.messageSuccess}>
                {submitSummary.recommendationsCreated > 0 ? (
                  <>
                    Envio finalizado. Foram geradas{" "}
                    <span className="font-semibold">
                      {submitSummary.recommendationsCreated}
                    </span>{" "}
                    recomenda��o(�es) com base nas suas respostas.{" "}
                    <Link
                      href={portfolioPendingLink(ids.formId)}
                      className="font-semibold underline decoration-emerald-400 underline-offset-2"
                    >
                      Ver recomenda��es pendentes
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Envio finalizado. Nenhuma recomenda��o foi disparada pelas respostas
                    atuais.
                  </>
                )}
              </div>
            ) : null}
          </div>
        ) : null}
        <details className="border-t border-slate-100 px-5 py-2 text-xs text-slate-500 sm:px-8">
          <summary className="cursor-pointer list-none text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="underline decoration-slate-300 underline-offset-2 group-open:text-slate-700">
              Suporte: identificador do formul�rio
            </span>
          </summary>
          <p className="mt-1 break-all font-mono text-micro text-slate-600">{ids.formId}</p>
        </details>
      </>
    );
  }

  return (
    <p className={formSurface.messageNeutral}>
      Abra o formulário pelo fluxo do respondente para preencher as questões.
    </p>
  );
}
