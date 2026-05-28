"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileWarning,
  HelpCircle,
  MapPinOff,
  RefreshCw,
  XCircle,
} from "lucide-react";
import {
  LIBRARY_SCENARIOS,
  LIBRARY_SCENARIO_LABEL,
  getRequiredScenariosFor,
} from "@/lib/library/binding-types";
import type {
  InlineMetric,
  LibraryBindings,
  LibraryScenarioKey,
  QuestionLibraryBinding,
  ResponseMapping,
} from "@/lib/library/binding-types";
import type { LibraryAxis, LibrarySection } from "@/lib/library/types";
import {
  fetchLibraryCatalog,
  fetchQuestionBinding,
  saveQuestionBinding,
} from "@/lib/library/client";
import {
  computeCoverageScore,
  scenarioBindingHasRecommendation,
} from "@/lib/library/binding-service";
import { OFFICIAL_RECOMMENDATION_TITLE_BY_SCENARIO } from "@/lib/library/default-recommendation-texts";
import { formSurface } from "@/lib/form-surface";

/** Resposta padrao assumida quando a pergunta ainda nao tem binding. */
const DEFAULT_ANSWER_TYPE: InlineMetric["answerType"] = "yes_no";
const RECOMMENDATION_TITLE_MAX = 500;

/** Contexto do cenário (complementa o título fixo do bloco). */
const SCENARIO_PROMPT: Record<LibraryScenarioKey, string> = {
  nao: "Quando o respondente marcar Não",
  nao_se_aplica: "Quando marcar Não se aplica",
  sim_sem_evidencia: "Quando marcar Sim sem anexar evidência",
  sim_evidencia_invalida: "Quando marcar Sim com evidência inválida ou insuficiente",
  sim_evidencia_valida:
    "Quando marcar Sim com evidência válida (em geral sem recomendação)",
  em_andamento: "Quando marcar Em andamento",
  nao_sabe: "Quando marcar Não sabe",
  em_revisao: "Quando marcar Em revisão",
  fora_de_escopo: "Quando marcar Fora de escopo",
};

/** Destaque visual por cenário — cores fixas (Tailwind JIT). */
const SCENARIO_ACCENTS: Record<
  LibraryScenarioKey,
  {
    bar: string;
    headerTint: string;
    iconBox: string;
    badge: string;
    Icon: LucideIcon;
  }
> = {
  nao: {
    bar: "border-l-rose-500",
    headerTint: "from-rose-50/95 via-rose-50/40 to-white",
    iconBox: "bg-rose-100 text-rose-700 ring-1 ring-rose-200/90",
    badge: "bg-rose-100 text-rose-950 ring-1 ring-rose-200/80",
    Icon: XCircle,
  },
  sim_sem_evidencia: {
    bar: "border-l-sky-500",
    headerTint: "from-sky-50/95 via-sky-50/35 to-white",
    iconBox: "bg-sky-100 text-sky-800 ring-1 ring-sky-200/90",
    badge: "bg-sky-100 text-sky-950 ring-1 ring-sky-200/80",
    Icon: AlertTriangle,
  },
  sim_evidencia_invalida: {
    bar: "border-l-violet-600",
    headerTint: "from-violet-50/95 via-violet-50/35 to-white",
    iconBox: "bg-violet-100 text-violet-800 ring-1 ring-violet-200/90",
    badge: "bg-violet-100 text-violet-950 ring-1 ring-violet-200/80",
    Icon: FileWarning,
  },
  sim_evidencia_valida: {
    bar: "border-l-emerald-500",
    headerTint: "from-emerald-50/95 via-emerald-50/35 to-white",
    iconBox: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200/90",
    badge: "bg-emerald-100 text-emerald-950 ring-1 ring-emerald-200/80",
    Icon: CheckCircle2,
  },
  nao_se_aplica: {
    bar: "border-l-slate-400",
    headerTint: "from-slate-100/90 via-slate-50/50 to-white",
    iconBox: "bg-slate-100 text-slate-700 ring-1 ring-slate-200/90",
    badge: "bg-slate-100 text-slate-900 ring-1 ring-slate-200/80",
    Icon: Ban,
  },
  em_andamento: {
    bar: "border-l-blue-500",
    headerTint: "from-blue-50/95 via-blue-50/35 to-white",
    iconBox: "bg-blue-100 text-blue-800 ring-1 ring-blue-200/90",
    badge: "bg-blue-100 text-blue-950 ring-1 ring-blue-200/80",
    Icon: Clock,
  },
  nao_sabe: {
    bar: "border-l-neutral-500",
    headerTint: "from-neutral-100/90 via-neutral-50/40 to-white",
    iconBox: "bg-neutral-100 text-neutral-800 ring-1 ring-neutral-200/90",
    badge: "bg-neutral-100 text-neutral-900 ring-1 ring-neutral-200/80",
    Icon: HelpCircle,
  },
  em_revisao: {
    bar: "border-l-indigo-500",
    headerTint: "from-indigo-50/95 via-indigo-50/35 to-white",
    iconBox: "bg-indigo-100 text-indigo-800 ring-1 ring-indigo-200/90",
    badge: "bg-indigo-100 text-indigo-950 ring-1 ring-indigo-200/80",
    Icon: RefreshCw,
  },
  fora_de_escopo: {
    bar: "border-l-stone-500",
    headerTint: "from-stone-100/90 via-stone-50/40 to-white",
    iconBox: "bg-stone-100 text-stone-800 ring-1 ring-stone-200/90",
    badge: "bg-stone-100 text-stone-900 ring-1 ring-stone-200/80",
    Icon: MapPinOff,
  },
};

const ANSWER_TYPE_LABEL: Record<InlineMetric["answerType"], string> = {
  yes_no: "Sim / Nao",
  scale: "Escala 1-5",
  numeric: "Numerico",
  text: "Texto livre",
};

function pruneBindingsPayload(bindings: LibraryBindings): LibraryBindings {
  const next: LibraryBindings = {};
  for (const key of LIBRARY_SCENARIOS) {
    const slot = bindings[key];
    if (!slot) continue;
    const actions = (slot.actions ?? []).filter((a) => a.title.trim().length > 0);
    const hasRec = scenarioBindingHasRecommendation(slot);
    if (!hasRec && actions.length === 0 && !slot.note && !slot.recommendationId) {
      continue;
    }
    next[key] = {
      recommendationId: slot.recommendationId,
      actionIds: slot.actionIds ?? [],
      recommendation: hasRec ? slot.recommendation : undefined,
      actions: actions.length > 0 ? actions : undefined,
      note: slot.note ?? null,
    };
  }
  return next;
}

export type FormQuestionRow = {
  id: string;
  prompt: string;
  requiresEvidence: boolean;
};

type FormBindingsPanelProps = {
  formId: string;
  questions: FormQuestionRow[];
};

function emptyBindings(): LibraryBindings {
  return {};
}

export function FormQuestionBindingsPanel({ formId, questions }: FormBindingsPanelProps) {
  const [catalog, setCatalog] = useState<{
    axes: LibraryAxis[];
    sections: LibrarySection[];
  } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(
    questions[0]?.id ?? null,
  );
  const [bindingsByQuestion, setBindingsByQuestion] = useState<
    Record<string, QuestionLibraryBinding | null>
  >({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLibraryCatalog()
      .then((snap) => {
        if (!cancelled) {
          setCatalog({
            axes: snap.axes,
            sections: snap.sections,
          });
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar catalogo.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadBinding = useCallback(
    async (questionId: string) => {
      setLoadingId(questionId);
      setError(null);
      try {
        const b = await fetchQuestionBinding(formId, questionId);
        setBindingsByQuestion((prev) => ({ ...prev, [questionId]: b }));
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Falha ao carregar vinculo.");
      } finally {
        setLoadingId(null);
      }
    },
    [formId],
  );

  useEffect(() => {
    if (!expandedId) return;
    if (bindingsByQuestion[expandedId] !== undefined) return;
    void loadBinding(expandedId);
  }, [expandedId, bindingsByQuestion, loadBinding]);

  const sectionsForAxis = useCallback(
    (axisId: string | null) => {
      if (!axisId || !catalog) return [];
      return catalog.sections.filter((s) => s.axisId === axisId);
    },
    [catalog],
  );

  async function handleSave(
    questionId: string,
    question: FormQuestionRow,
    draft: QuestionLibraryBinding,
  ) {
    setSavingId(questionId);
    setError(null);
    try {
      // A UI simplificada envia apenas `answerType`; o servidor preenche
      // name (a partir do enunciado), interpretation (default razoavel) e
      // severityHint (null por padrao).
      const metricPayload = draft.metric?.answerType
        ? { answerType: draft.metric.answerType }
        : null;
      const saved = await saveQuestionBinding(formId, questionId, {
        axisId: draft.axisId,
        sectionId: draft.sectionId,
        metric: metricPayload,
        bindings: draft.bindings,
        responseMapping: draft.responseMapping,
      });
      setBindingsByQuestion((prev) => ({ ...prev, [questionId]: saved }));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSavingId(null);
    }
  }

  if (!catalog) {
    return (
      <p className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Carregando eixos e secoes...
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {questions.map((q) => (
        <QuestionBindingCard
          key={q.id}
          formId={formId}
          question={q}
          catalog={catalog}
          expanded={expandedId === q.id}
          onToggle={() => setExpandedId((id) => (id === q.id ? null : q.id))}
          binding={bindingsByQuestion[q.id] ?? null}
          loading={loadingId === q.id}
          saving={savingId === q.id}
          sectionsForAxis={sectionsForAxis}
          onReload={() => void loadBinding(q.id)}
          onSave={(draft) => void handleSave(q.id, q, draft)}
        />
      ))}
    </div>
  );
}

type CardProps = {
  formId: string;
  question: FormQuestionRow;
  catalog: {
    axes: LibraryAxis[];
    sections: LibrarySection[];
  };
  expanded: boolean;
  onToggle: () => void;
  binding: QuestionLibraryBinding | null;
  loading: boolean;
  saving: boolean;
  sectionsForAxis: (axisId: string | null) => LibrarySection[];
  onReload: () => void;
  onSave: (draft: QuestionLibraryBinding) => void;
};

function QuestionBindingCard({
  question,
  catalog,
  expanded,
  onToggle,
  binding,
  loading,
  saving,
  sectionsForAxis,
  onReload,
  onSave,
}: CardProps) {
  const [axisId, setAxisId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [answerType, setAnswerType] = useState<InlineMetric["answerType"]>(
    DEFAULT_ANSWER_TYPE,
  );
  const [bindings, setBindings] = useState<LibraryBindings>(() => emptyBindings());
  const [responseMapping, setResponseMapping] = useState<ResponseMapping>({});

  // Sincroniza estado de edicao com o vinculo carregado do servidor.
  useEffect(() => {
    if (!binding) return;
    setAxisId(binding.axisId ?? "");
    setSectionId(binding.sectionId ?? "");
    setAnswerType(binding.metric?.answerType ?? DEFAULT_ANSWER_TYPE);
    setBindings(
      binding.bindings && Object.keys(binding.bindings).length > 0 ? binding.bindings : {},
    );
    setResponseMapping(binding.responseMapping ?? {});
  }, [binding]);

  const shownScenarios = useMemo(
    () => getRequiredScenariosFor(answerType, question.requiresEvidence),
    [answerType, question.requiresEvidence],
  );

  const coverage = useMemo(
    () =>
      computeCoverageScore(bindings, {
        answerType,
        requiresEvidence: question.requiresEvidence,
      }),
    [bindings, answerType, question.requiresEvidence],
  );

  const sectionOptions = sectionsForAxis(axisId || null);
  const canSaveLink = Boolean(axisId && sectionId);

  function updateScenario(
    scenario: LibraryScenarioKey,
    patch: Partial<NonNullable<LibraryBindings[typeof scenario]>>,
  ) {
    setBindings((prev) => {
      const cur = prev[scenario] ?? {
        recommendationId: null,
        actionIds: [],
      };
      return {
        ...prev,
        [scenario]: { ...cur, ...patch },
      };
    });
  }

  function buildDraft(): QuestionLibraryBinding {
    const pruned = pruneBindingsPayload(bindings);
    const cov = computeCoverageScore(pruned, {
      answerType,
      requiresEvidence: question.requiresEvidence,
    });
    // A UI so edita `answerType`; os demais campos do `metric` sao preenchidos
    // pelo servidor (name a partir do enunciado da pergunta, interpretation
    // default). Aqui mandamos um objeto parcial valido.
    const metricPayload: InlineMetric = {
      name: binding?.metric?.name ?? question.prompt,
      description: binding?.metric?.description ?? null,
      answerType,
      interpretation:
        binding?.metric?.interpretation ??
        (answerType === "scale" || answerType === "numeric"
          ? "higher_better"
          : "qualitative"),
    };
    return {
      questionId: question.id,
      axisId: axisId || null,
      sectionId: sectionId || null,
      metricId: null,
      metric: metricPayload,
      bindings: pruned,
      responseMapping,
      coverageScore: cov,
      updatedBy: null,
      updatedAt: new Date().toISOString(),
    };
  }

  return (
    <div className={`${formSurface.card} overflow-hidden`}>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition sm:px-5 sm:py-4 ${
          expanded
            ? "border-b border-slate-100 bg-gradient-to-r from-brand-50/80 via-white to-slate-50/30"
            : "hover:bg-slate-50/90"
        }`}
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug text-slate-900 line-clamp-2">
            {question.prompt}
          </p>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600">
            <span
              className={`inline-flex rounded-md px-2 py-0.5 font-medium ${
                question.requiresEvidence
                  ? "bg-sky-50 text-sky-900 ring-1 ring-sky-100"
                  : "bg-slate-100 text-slate-700 ring-1 ring-slate-200/80"
              }`}
            >
              {question.requiresEvidence ? "Exige evidência" : "Não exige evidência"}
            </span>
            <span className="text-slate-400">·</span>
            <span>
              Cobertura{" "}
              <span className="tabular-nums font-semibold text-slate-800">{coverage.toFixed(0)}%</span>
            </span>
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-brand-800 shadow-sm ring-1 ring-brand-100">
          {expanded ? "Recolher" : "Expandir"}
        </span>
      </button>

      {expanded ? (
        <div className="space-y-5 bg-gradient-to-b from-slate-50/40 to-white px-4 py-5 sm:px-6">
          {loading ? (
            <p className="text-sm text-slate-500">Carregando vinculo...</p>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm ring-1 ring-slate-100/80 sm:p-5">
                <p className={formSurface.label}>Classificação na biblioteca</p>
                <p className="mb-4 mt-1 text-xs leading-relaxed text-slate-600">
                  Associe a pergunta a um eixo e a uma seção. O tipo de resposta define quais cenários de recomendação
                  aparecem abaixo.
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className={formSurface.fieldGroup}>
                    <span className={formSurface.label}>Eixo</span>
                    <select
                      value={axisId}
                      onChange={(e) => {
                        setAxisId(e.target.value);
                        setSectionId("");
                      }}
                      className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
                    >
                      <option value="">Selecione...</option>
                      {catalog.axes.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.code} — {a.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={formSurface.fieldGroup}>
                    <span className={formSurface.label}>Seção</span>
                    <select
                      value={sectionId}
                      onChange={(e) => setSectionId(e.target.value)}
                      disabled={!axisId}
                      className={`${formSurface.inputSelect} font-normal normal-case tracking-normal disabled:cursor-not-allowed`}
                    >
                      <option value="">Selecione...</option>
                      {sectionOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} — {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className={formSurface.fieldGroup}>
                    <span className={formSurface.label}>Tipo de resposta</span>
                    <select
                      value={answerType}
                      onChange={(e) =>
                        setAnswerType(e.target.value as InlineMetric["answerType"])
                      }
                      className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
                    >
                      {(Object.keys(ANSWER_TYPE_LABEL) as InlineMetric["answerType"][]).map((k) => (
                        <option key={k} value={k}>
                          {ANSWER_TYPE_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>

              {answerType === "scale" || answerType === "numeric" ? (
                <ResponseMappingEditor
                  answerType={answerType}
                  value={responseMapping}
                  onChange={setResponseMapping}
                />
              ) : null}

              {shownScenarios.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-xs leading-relaxed text-slate-600">
                  Esse tipo de resposta nao gera recomendacoes automaticas. Publique apenas se a pergunta nao precisar
                  de recomendacao por cenario.
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-brand-200/60 bg-gradient-to-r from-brand-50/70 via-white to-emerald-50/30 px-4 py-3.5 sm:px-5">
                    <p className="text-sm font-semibold text-slate-900">Recomendações por cenário</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      Cada cor corresponde a um cenário diferente (resposta e evidência). Preencha o texto onde quiser
                      gerar recomendação; deixe em branco para não disparar.
                    </p>
                  </div>
                  <div className="space-y-4">
                    {shownScenarios.map((scenario) => (
                      <ScenarioRow
                        key={scenario}
                        questionId={question.id}
                        scenario={scenario}
                        slot={bindings[scenario]}
                        onUpdate={(patch) => updateScenario(scenario, patch)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!canSaveLink ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950">
                  Selecione o eixo e a secao da biblioteca para cada pergunta antes de salvar o vinculo.
                </p>
              ) : null}

              <div className="flex flex-col gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100/70 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-x-3 sm:px-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={saving || !canSaveLink}
                    title={!canSaveLink ? "Preencha eixo e secao obrigatorios" : undefined}
                    onClick={() => onSave(buildDraft())}
                    className={`${formSurface.primaryButtonSm} disabled:opacity-50`}
                  >
                    {saving ? "Salvando..." : "Salvar vinculo"}
                  </button>
                  <button type="button" onClick={onReload} className={formSurface.secondaryButtonSm}>
                    Recarregar
                  </button>
                </div>
                <span
                  className={`${formSurface.badge.base} ${formSurface.badge.neutral} w-fit normal-case tracking-normal`}
                >
                  Cobertura {coverage.toFixed(0)}%
                  {shownScenarios.length > 0
                    ? ` · ${shownScenarios.length} cenário${shownScenarios.length === 1 ? "" : "s"}`
                    : ""}
                </span>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ScenarioRow({
  questionId,
  scenario,
  slot,
  onUpdate,
}: {
  questionId: string;
  scenario: LibraryScenarioKey;
  slot: LibraryBindings[LibraryScenarioKey] | undefined;
  onUpdate: (patch: Partial<NonNullable<LibraryBindings[LibraryScenarioKey]>>) => void;
}) {
  const accent = SCENARIO_ACCENTS[scenario];
  const ScenarioIcon = accent.Icon;
  const rec = slot?.recommendation;
  const textareaId = `rec-title-${questionId}-${scenario}`;
  const recPatch = (
    field: keyof NonNullable<typeof rec>,
    value: string | null,
  ) =>
    onUpdate({
      recommendation: {
        title: rec?.title ?? "",
        description: rec?.description ?? null,
        textoBaseFixo: rec?.textoBaseFixo ?? null,
        textoBaseParametrizavel: rec?.textoBaseParametrizavel ?? null,
        tipo: rec?.tipo ?? null,
        fundamentoTecnico: rec?.fundamentoTecnico ?? null,
        escopoAplicacao: rec?.escopoAplicacao ?? null,
        [field]: value,
      },
    });

  const officialTitle = OFFICIAL_RECOMMENDATION_TITLE_BY_SCENARIO[scenario];

  function applySuggestedTitle() {
    if (!officialTitle) return;
    const current = (rec?.title ?? "").trim();
    if (current.length > 0) {
      const ok = window.confirm(
        "Substituir o texto atual pelo texto sugerido? Esta ação não pode ser desfeita automaticamente.",
      );
      if (!ok) return;
    }
    recPatch("title", officialTitle);
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-r border-t border-b border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/70 ${accent.bar} border-l-4`}
    >
      <div className={`bg-gradient-to-r px-4 py-3.5 sm:px-5 ${accent.headerTint}`}>
        <div className="flex gap-3">
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm ${accent.iconBox}`}
            aria-hidden
          >
            <ScenarioIcon className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <span
              className={`inline-flex max-w-full rounded-full px-2.5 py-1 text-micro font-bold uppercase tracking-wide ${accent.badge}`}
            >
              {LIBRARY_SCENARIO_LABEL[scenario]}
            </span>
            <p className="mt-2 text-sm font-medium leading-snug text-slate-800">
              {SCENARIO_PROMPT[scenario] ?? LIBRARY_SCENARIO_LABEL[scenario]}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 bg-white px-4 py-4 sm:px-5">
        <label htmlFor={textareaId} className={formSurface.label}>
          Texto da recomendação (título)
        </label>
        <textarea
          id={textareaId}
          placeholder="Texto principal exibido na recomendação quando este cenário disparar (deixe em branco para não gerar)"
          value={rec?.title ?? ""}
          onChange={(e) => recPatch("title", e.target.value)}
          maxLength={RECOMMENDATION_TITLE_MAX}
          rows={3}
          className={formSurface.inputTextarea}
        />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="text-micro tabular-nums text-slate-500">
            {(rec?.title?.length ?? 0)}/{RECOMMENDATION_TITLE_MAX} caracteres
          </p>
          {officialTitle ? (
            <button
              type="button"
              onClick={applySuggestedTitle}
              className="text-micro font-semibold text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
            >
              Usar texto sugerido
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResponseMappingEditor({
  answerType,
  value,
  onChange,
}: {
  answerType: "scale" | "numeric";
  value: ResponseMapping;
  onChange: (next: ResponseMapping) => void;
}) {
  const scale = value.scaleBands ?? null;
  const numeric = value.numericThresholds ?? null;

  return (
    <details className="rounded-md border border-slate-200 bg-white p-3">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-600">
        Faixas / limiares (opcional)
      </summary>
      <p className="mt-2 text-xs text-slate-600">
        Define como os valores sao agrupados nos cenarios nao / nao_se_aplica.
      </p>
      {answerType === "scale" ? (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-700">
            Ate (inclusive) para &quot;nao&quot;
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              value={scale?.failMax ?? ""}
              placeholder="Padrao 2"
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                onChange({
                  ...value,
                  scaleBands:
                    v === null
                      ? null
                      : {
                          failMax: v,
                          notApplicableMax: scale?.notApplicableMax ?? 3,
                        },
                });
              }}
              className={`mt-1 ${formSurface.input}`}
            />
          </label>
          <label className="text-xs text-slate-700">
            Ate (inclusive) para &quot;nao se aplica&quot;
            <input
              type="number"
              min={1}
              max={5}
              step={1}
              value={scale?.notApplicableMax ?? ""}
              placeholder="Padrao 3"
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                onChange({
                  ...value,
                  scaleBands:
                    v === null
                      ? null
                      : {
                          failMax: scale?.failMax ?? 2,
                          notApplicableMax: v,
                        },
                });
              }}
              className={`mt-1 ${formSurface.input}`}
            />
          </label>
        </div>
      ) : (
        <div className="mt-2 grid gap-2 md:grid-cols-2">
          <label className="text-xs text-slate-700">
            Ate (inclusive) para &quot;nao&quot;
            <input
              type="number"
              value={numeric?.failBelow ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                onChange({
                  ...value,
                  numericThresholds:
                    v === null
                      ? null
                      : {
                          failBelow: v,
                          notApplicableBelow: numeric?.notApplicableBelow ?? v + 1,
                        },
                });
              }}
              className={`mt-1 ${formSurface.input}`}
            />
          </label>
          <label className="text-xs text-slate-700">
            Ate (inclusive) para &quot;nao se aplica&quot;
            <input
              type="number"
              value={numeric?.notApplicableBelow ?? ""}
              onChange={(e) => {
                const v = e.target.value === "" ? null : Number(e.target.value);
                onChange({
                  ...value,
                  numericThresholds:
                    v === null
                      ? null
                      : {
                          failBelow: numeric?.failBelow ?? v - 1,
                          notApplicableBelow: v,
                        },
                });
              }}
              className={`mt-1 ${formSurface.input}`}
            />
          </label>
        </div>
      )}
    </details>
  );
}
