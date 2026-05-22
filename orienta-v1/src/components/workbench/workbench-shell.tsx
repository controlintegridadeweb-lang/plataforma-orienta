"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronLeft, RefreshCw, SendHorizontal } from "lucide-react";
import { getRuntimeDefaults } from "@/lib/client/runtime-defaults";
import { RespondentSectionWizard } from "@/components/respondente/respondent-section-wizard";
import {
  fetchWorkbenchData,
  reprocessFami,
  removeEvidenceAttachment,
  submitEvidenceValidation,
  submitRespondentForm,
  submitWorkbenchResponse,
  uploadEvidenceFile,
  type WorkbenchEvidencePayload,
} from "@/lib/client/workbench-api";
import {
  workbenchRowAllowsPartial,
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
import { formSurface } from "@/lib/form-surface";
import { describeError, notify } from "@/lib/notify";
import {
  countCompleteRows,
  draftFromRow,
  sectionStorageKey,
} from "@/lib/workbench/section-progress";

type Mode = "respondent" | "analyst" | "full";
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

type ValidationAction = "valid" | "invalid" | "complementation_requested";

function truncatePrompt(prompt: string, max = 80): string {
  const trimmed = prompt.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

/** Mensagens de rotina no fluxo por etapas — não exibir faixa no topo. */
function isRoutineWorkbenchMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("salva") ||
    m.includes("removido") ||
    m.includes("registrad") ||
    m.includes("carregando questoes") ||
    m.includes("ultima secao") ||
    m.includes("continue no proximo") ||
    m.includes("revise o resumo")
  );
}

export function WorkbenchShell({
  mode,
  useSessionContext = true,
  initialFormId,
  lockedOrganizationId,
  lockedOrganizationName,
  /** Se true, busca as questoes ao abrir a tela (fluxo "Responder" do respondente). */
  autoLoad = false,
  /** Quando informado, exibe um dropdown de formularios em vez do campo de UUID livre. */
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
    analystUserId: runtime.analystUserId,
  }));
  const canAutoLoad = Boolean(
    autoLoad && (initialFormId ?? runtime.formId) && (lockedOrganizationId ?? runtime.organizationId),
  );
  const [data, setData] = useState<WorkbenchPayload | null>(null);
  const [message, setMessage] = useState(() =>
    canAutoLoad ? "Carregando questoes..." : "Carregue o formulario para iniciar.",
  );
  const [loading, setLoading] = useState(() => canAutoLoad);
  const [savingQuestionId, setSavingQuestionId] = useState<string | null>(null);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<string, EvidenceDraft>>({});
  const [statusFilter, setStatusFilter] = useState("all");
  const [submittingForm, setSubmittingForm] = useState(false);
  const [submitSummary, setSubmitSummary] = useState<{ recommendationsCreated: number } | null>(
    null,
  );
  /** Sim escolhido antes de anexar evidencia (ainda nao persistido). */
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

  const displayRows = useMemo((): Row[] => {
    if (!data?.rows) return [];
    return data.rows.map((row) => {
      if (pendingYesQuestionIds.has(row.questionId) && row.answer !== "yes") {
        return { ...row, answer: "yes" };
      }
      return row;
    });
  }, [data?.rows, pendingYesQuestionIds]);

  const orgLocked = Boolean(useSessionContext && lockedOrganizationId);
  const showRespondent = mode === "respondent" || mode === "full";
  const showAnalyst = mode === "analyst" || mode === "full";
  const simplifiedRespondent = Boolean(
    autoLoad && useSessionContext && orgLocked && mode === "respondent",
  );

  const groupedByAxis = useMemo(() => {
    const map = new Map<string, Row[]>();
    for (const row of data?.rows ?? []) {
      if (statusFilter !== "all" && (row.validationStatus ?? "none") !== statusFilter) continue;
      if (!map.has(row.axisName)) map.set(row.axisName, []);
      map.get(row.axisName)?.push(row);
    }
    return [...map.entries()];
  }, [data, statusFilter]);

  const groupedBySection = useMemo(() => {
    const sections: { name: string; rows: Row[] }[] = [];
    const indexByName = new Map<string, number>();
    for (const row of displayRows) {
      if (statusFilter !== "all" && (row.validationStatus ?? "none") !== statusFilter) continue;
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
  }, [displayRows, statusFilter]);

  const role: "analyst" | "respondent" = mode === "respondent" ? "respondent" : "analyst";

  const loadWorkbench = useCallback(async () => {
    const isRefresh = hasLoadedWorkbenchRef.current;
    if (!isRefresh) {
      setLoading(true);
    }
    if (simplifiedRespondent && isRefresh) {
      setMessage("");
    } else if (!isRefresh) {
      setMessage("Carregando questoes...");
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
      setMessage("Pronto. Responda as questoes abaixo; use Atualizar se precisar recarregar.");
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

  async function validate(row: Row, status: ValidationAction) {
    if (!row.responseId) {
      setMessage("Nao ha resposta salva para validar.");
      return;
    }
    const response = await submitEvidenceValidation(
      ids,
      { responseId: row.responseId, status },
      useSessionContext,
    );
    const payload = await response.json();
    if (!response.ok) {
      setMessage(
        typeof payload.error === "string" ? payload.error : "Falha ao validar evidencia.",
      );
      return;
    }
    await loadWorkbench();
    setMessage("Validacao registrada.");
  }

  async function reprocess() {
    const response = await reprocessFami(ids, useSessionContext);
    const payload = await response.json();
    if (!response.ok) {
      setMessage(typeof payload.error === "string" ? payload.error : "Falha ao reprocessar FAMI.");
      return;
    }
    setMessage("FAMI reprocessado.");
  }

  async function handleRemoveEvidence(row: Row) {
    if (!window.confirm("Remover anexo ou link desta evidencia?")) return;
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
          title: p[row.questionId]?.title?.trim() || file.name.replace(/\.[^.]+$/, "") || "Evidencia",
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

  async function handleSelectAnswer(row: Row, answer: "yes" | "no" | "partial") {
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
    answer: "yes" | "no" | "partial",
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
        // Evidencia ja persistida no servidor; resposta Sim sem payload novo.
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
      if (!options?.silent && !simplifiedRespondent) {
        setMessage("Resposta salva.");
      } else if (simplifiedRespondent) {
        setMessage("");
      }
    } finally {
      setSavingQuestionId(null);
    }
  }

  const sectionDraftsForProgress = useMemo(() => {
    const m: Record<
      string,
      { kind: EvidenceDraft["kind"]; title: string; storagePath: string | null; externalLink: string }
    > = {};
    for (const row of data?.rows ?? []) {
      m[row.questionId] = evidenceDrafts[row.questionId] ?? draftFromRow(row);
    }
    return m;
  }, [data?.rows, evidenceDrafts]);

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
        parts.push(`${missingEvidence.length} com evidencia pendente`);
      }
      notify.warning(`Conclua esta seção antes de continuar.`, {
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
        parts.push(`${missingEvidence.length} com evidencia pendente`);
      }
      notify.warning(
        `Faltam ${totalPending} pergunta(s) para concluir o formulario.`,
        { description: parts.join(" \u2022 "), duration: 8000 },
      );
      return;
    }

    if (mode !== "respondent") {
      notify.success("Formulario completo: todas as respostas ja estao salvas.");
      return;
    }

    setSubmittingForm(true);
    setSubmitSummary(null);
    const loadingId = notify.loading("Enviando formulario e gerando recomendacoes…");
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
            : "Falha ao enviar o formulario. Tente novamente.",
          { id: loadingId },
        );
        return;
      }
      const created = payload.recommendationsCreated ?? 0;
      setSubmitSummary({ recommendationsCreated: created });
      notify.success(
        created > 0
          ? `Formulario enviado. ${created} recomendacao(oes) gerada(s).`
          : "Formulario enviado. Nenhuma recomendacao foi disparada pelas respostas atuais.",
        { id: loadingId },
      );
    } catch (e: unknown) {
      notify.error(describeError(e, "Falha ao enviar o formulario. Tente novamente."), {
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
            <p className="text-center text-sm text-slate-500">Nao ha questoes vinculadas a este formulario.</p>
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
                  className={`${formSurface.secondaryButton} inline-flex items-center justify-center gap-2 sm:min-w-[140px]`}
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
                    className={`${formSurface.primaryButton} inline-flex items-center justify-center gap-2 sm:min-w-[180px]`}
                  >
                    {advancingSection ? "Salvando…" : "Continuar"}
                    <ArrowRight className="h-4 w-4" aria-hidden />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => void handleSectionContinue()}
                      disabled={navBusy}
                      className={`${formSurface.secondaryButton} inline-flex items-center justify-center gap-2 sm:min-w-[160px]`}
                    >
                      {advancingSection ? "Salvando…" : "Concluir seção"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSubmitForm()}
                      disabled={navBusy}
                      className={`${formSurface.primaryButton} inline-flex items-center justify-center gap-2 sm:min-w-[200px]`}
                    >
                      <SendHorizontal className="h-4 w-4" aria-hidden />
                      {submittingForm ? "Enviando…" : "Enviar formulário"}
                    </button>
                  </>
                )}
              </div>
            </div>
            {submitSummary ? (
              <div className={formSurface.messageSuccess}>
                {submitSummary.recommendationsCreated > 0 ? (
                  <>
                    Formulário enviado. Foram geradas{" "}
                    <span className="font-semibold">
                      {submitSummary.recommendationsCreated}
                    </span>{" "}
                    recomendação(ões) com base nas suas respostas.{" "}
                    <Link
                      href="/respondente/plano-acao"
                      className="font-semibold underline decoration-emerald-400 underline-offset-2"
                    >
                      Ir para o plano de ação
                    </Link>
                    .
                  </>
                ) : (
                  <>
                    Formulário enviado. Nenhuma recomendação foi disparada pelas respostas
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
              Suporte: identificador do formulario
            </span>
          </summary>
          <p className="mt-1 break-all font-mono text-[11px] text-slate-600">{ids.formId}</p>
        </details>
      </>
    );
  }

  const heading =
    mode === "respondent"
      ? "Area do Respondente"
      : mode === "analyst"
        ? "Validacao de evidencias"
        : "Bancada Operacional";
  const subheading =
    mode === "analyst"
      ? "Selecione o formulario para revisar as respostas e validar evidencias da organizacao."
      : mode === "respondent"
        ? "Carregue o formulario para iniciar o preenchimento."
        : "Operacao avancada com visao do respondente e analista no mesmo lugar.";
  const messageTone = (() => {
    if (!message) return "neutral" as const;
    const lower = message.toLowerCase();
    if (/falha|erro|nao (foi|est)|invalido|expirado/.test(lower)) return "error" as const;
    if (/salva|registrada|reprocessado|pronto/.test(lower)) return "success" as const;
    return "neutral" as const;
  })();

  const formDeadline = formatDeadline(data?.form.responseDeadlineAt);
  const formClosed = data?.form.state === "closed";
  const formClosedAt = formatDeadline(data?.form.closedAt);

  return (
    <section className={formSurface.card}>
      <header className={formSurface.cardHeader}>
        <h2 className={formSurface.cardTitle}>{heading}</h2>
        <p className={formSurface.cardDescription}>{subheading}</p>
      </header>

      <div className={formSurface.body}>
        {formClosed ? (
          <div
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            role="status"
          >
            Ciclo encerrado{formClosedAt ? ` em ${formClosedAt}` : ""}. Novas respostas
            estao bloqueadas; FAMI exibido e oficial (perguntas aplicaveis sem
            resposta contam 0 ponto).
          </div>
        ) : formDeadline ? (
          <div
            className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
            role="status"
          >
            Prazo para responder este formulario: <strong>{formDeadline}</strong>.
            Após o encerramento, perguntas aplicaveis sem resposta entram com 0
            ponto no FAMI.
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div className={formSurface.fieldGroup}>
            <label htmlFor="workbench-form-id" className={formSurface.label}>
              Formulario
            </label>
            {availableForms && availableForms.length > 0 ? (
              <select
                id="workbench-form-id"
                className={formSurface.inputSelect}
                value={ids.formId}
                onChange={(e) => setIds((p) => ({ ...p, formId: e.target.value }))}
              >
                <option value="">Selecione um formulario…</option>
                {availableForms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name || "Formulario"}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="workbench-form-id"
                className={formSurface.input}
                value={ids.formId}
                onChange={(e) => setIds((p) => ({ ...p, formId: e.target.value }))}
                readOnly={false}
                autoComplete="off"
                placeholder="Identificador do formulario"
              />
            )}
          </div>

          {orgLocked ? (
            <div className={formSurface.fieldGroup}>
              <p className={formSurface.label}>Organizacao</p>
              <div className={formSurface.readOnlyField}>{lockedOrganizationName ?? "—"}</div>
            </div>
          ) : (
            <div className={formSurface.fieldGroup}>
              <label htmlFor="workbench-org-id" className={formSurface.label}>
                Organizacao
              </label>
              <input
                id="workbench-org-id"
                className={formSurface.input}
                value={ids.organizationId}
                onChange={(e) => setIds((p) => ({ ...p, organizationId: e.target.value }))}
                placeholder="Identificador da organizacao"
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => void loadWorkbench()}
            disabled={loading || !ids.formId || !ids.organizationId}
            className={formSurface.primaryButton}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
            {loading ? "Carregando…" : "Carregar"}
          </button>
          {showAnalyst ? (
            <button
              type="button"
              onClick={reprocess}
              disabled={!ids.formId || !ids.organizationId}
              className={formSurface.secondaryButton}
            >
              Reprocessar FAMI
            </button>
          ) : null}
          {showAnalyst ? (
            <label className="flex w-full min-w-0 flex-col gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 sm:ml-auto sm:w-auto sm:flex-row sm:items-center">
              <span>Filtrar validacao</span>
              <select
                className={`${formSurface.inputSelect} w-full min-w-0 sm:w-auto sm:min-w-[11rem] font-normal normal-case tracking-normal text-slate-800`}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos</option>
                <option value="none">Nao validada</option>
                <option value="valid">Valida</option>
                <option value="invalid">Invalida</option>
                <option value="complementation_requested">Complementacao</option>
              </select>
            </label>
          ) : null}
        </div>

        {message ? (
          <div
            role="status"
            className={
              messageTone === "error"
                ? formSurface.messageError
                : messageTone === "success"
                  ? formSurface.messageSuccess
                  : formSurface.messageNeutral
            }
          >
            {message}
          </div>
        ) : null}

        <div className="space-y-4">
          {groupedByAxis.map(([axis, rows]) => (
            <article key={axis} className="overflow-hidden rounded-xl border border-slate-200">
              <div className="border-b border-slate-100/80 bg-brand-50 px-4 py-2.5 text-sm font-semibold text-slate-800">
                {axis}
              </div>
              <div className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <div key={row.questionId} className="space-y-3 px-4 py-3 text-sm">
                    <p className="font-medium text-slate-900">{row.prompt}</p>
                    <p className="text-xs text-slate-500">
                      Secao: <span className="text-slate-700">{row.sectionName}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      Resposta:{" "}
                      <span className="text-slate-700">{row.answer ?? "Nao respondida"}</span>
                      <span className="mx-2 text-slate-300">·</span>
                      Validacao:{" "}
                      <span className="text-slate-700">{row.validationStatus ?? "Nao validada"}</span>
                    </p>
                    {showRespondent ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => saveResponse(row, "yes")}
                          className={formSurface.secondaryButtonSm}
                        >
                          Sim
                        </button>
                        <button
                          type="button"
                          onClick={() => saveResponse(row, "no")}
                          className={formSurface.secondaryButtonSm}
                        >
                          Nao
                        </button>
                        {workbenchRowAllowsPartial(row) ? (
                          <button
                            type="button"
                            onClick={() => saveResponse(row, "partial")}
                            className={formSurface.secondaryButtonSm}
                          >
                            Parcialmente
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {showAnalyst && row.requiresEvidence ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => validate(row, "valid")}
                          className={formSurface.secondaryButtonSm}
                        >
                          Validar
                        </button>
                        <button
                          type="button"
                          onClick={() => validate(row, "invalid")}
                          className={formSurface.secondaryButtonSm}
                        >
                          Invalida
                        </button>
                        <button
                          type="button"
                          onClick={() => validate(row, "complementation_requested")}
                          className={formSurface.secondaryButtonSm}
                        >
                          Complementacao
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>

        {ids.formId ? (
          <details className="group rounded-xl border border-slate-100 bg-slate-50/40 px-4 py-2 text-xs text-slate-500">
            <summary className="cursor-pointer list-none text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="underline decoration-slate-300 underline-offset-2 group-open:text-slate-700">
                Suporte: identificadores
              </span>
            </summary>
            <p className="mt-1 break-all font-mono text-[11px] text-slate-600">
              Formulario: {ids.formId}
              {ids.organizationId ? (
                <>
                  <br />
                  Organizacao: {ids.organizationId}
                </>
              ) : null}
            </p>
          </details>
        ) : null}
      </div>
    </section>
  );
}
