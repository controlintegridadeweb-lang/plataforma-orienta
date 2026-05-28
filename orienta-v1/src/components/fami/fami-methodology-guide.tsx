"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Calculator,
  ChevronDown,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { formSurface } from "@/lib/layout/form-surface";
import {
  FAMI_EXPLAIN_CARDS,
  FAMI_GUIDE_INTRO,
  FAMI_SCORING_DETAIL,
  type FamiExplainCardTone,
} from "@/lib/fami/methodology-content";
import { FamiMaturityRoadmap } from "./fami-maturity-roadmap";

type Props = {
  defaultExpanded?: boolean;
  currentLevel?: number | null;
  className?: string;
};

type ExplainStep = (typeof FAMI_EXPLAIN_CARDS)[number];

/** Escala da timeline — presença visual + compactação de espaços. */
const TIMELINE_SCALE = {
  wrap: "w-full max-w-none lg:max-w-224 xl:max-w-240",
  /** Linha vertical contínua (atrás dos nós). */
  spine:
    "pointer-events-none absolute z-0 w-0.5 -translate-x-1/2 rounded-full bg-gradient-to-b from-brand-300/70 via-slate-300/75 to-brand-400/55",
  /** Eixo da linha em mobile/tablet (centro da coluna de ícones = 1.5rem). */
  spineAxisLeft: "left-6",
  /** Coluna fixa do ícone + conteúdo (evita sobreposição). */
  railGrid: "grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-4",
  stepPad: "pt-4 first:pt-0 lg:pt-3 lg:first:pt-0",
} as const;

const STEP_ICONS: Record<ExplainStep["id"], LucideIcon> = {
  what: BookOpen,
  how: Calculator,
  influence: SlidersHorizontal,
  sync: RefreshCw,
};

/** Tons suaves alinhados à sidebar (brand/teal) — baixa saturação. */
const TONE: Record<
  FamiExplainCardTone,
  {
    node: string;
    nodeBorder: string;
    nodeIcon: string;
    accent: string;
    chip: string;
    formula: string;
    bullet: string;
    panelTint: string;
  }
> = {
  brand: {
    node: "bg-brand-50",
    nodeBorder: "border-brand-200/70",
    nodeIcon: "text-brand-600",
    accent: "text-brand-700/80",
    chip: "bg-brand-50/90 text-slate-600 ring-1 ring-brand-100/60",
    formula: "bg-brand-50/80 text-brand-800 ring-1 ring-brand-100/50",
    bullet: "bg-brand-400/70",
    panelTint: "bg-white/95",
  },
  sky: {
    node: "bg-slate-50",
    nodeBorder: "border-slate-200/80",
    nodeIcon: "text-slate-600",
    accent: "text-slate-600",
    chip: "bg-slate-50 text-slate-600 ring-1 ring-slate-200/70",
    formula: "bg-slate-50 text-slate-800 ring-1 ring-slate-200/60",
    bullet: "bg-slate-400/70",
    panelTint: "bg-white/95",
  },
  violet: {
    node: "bg-violet-50/80",
    nodeBorder: "border-violet-200/50",
    nodeIcon: "text-violet-600/90",
    accent: "text-violet-700/75",
    chip: "bg-violet-50/60 text-slate-600 ring-1 ring-violet-100/50",
    formula: "bg-violet-50/70 text-violet-900/90 ring-1 ring-violet-100/40",
    bullet: "bg-violet-400/50",
    panelTint: "bg-white/95",
  },
  emerald: {
    node: "bg-brand-50/70",
    nodeBorder: "border-brand-200/60",
    nodeIcon: "text-brand-700/85",
    accent: "text-brand-800/70",
    chip: "bg-brand-50/80 text-slate-600 ring-1 ring-brand-100/50",
    formula: "bg-brand-50/70 text-brand-900/85 ring-1 ring-brand-100/40",
    bullet: "bg-brand-400/60",
    panelTint: "bg-white/95",
  },
};

function StepBullets({
  items,
  tone,
  alignEnd = false,
}: {
  items: readonly string[];
  tone: FamiExplainCardTone;
  alignEnd?: boolean;
}) {
  const t = TONE[tone];
  return (
    <ul className={`mt-2.5 flex flex-wrap gap-1.5 ${alignEnd ? "lg:justify-end" : ""}`}>
      {items.map((item) => (
        <li
          key={item}
          className={`inline-flex max-w-full items-center gap-2 rounded-lg px-2.5 py-1 text-xs leading-snug text-slate-600 ${t.chip}`}
        >
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${t.bullet}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

function StepScoringWeights({
  tone,
  alignEnd = false,
}: {
  tone: FamiExplainCardTone;
  alignEnd?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div className={`mt-2.5 flex flex-wrap gap-1.5 ${alignEnd ? "lg:justify-end" : ""}`}>
      {FAMI_SCORING_DETAIL.map((row) => (
        <span
          key={row.points}
          className={`inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${t.chip}`}
          title={row.label}
        >
          <span className="font-semibold tabular-nums">{row.points} pt</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-600">{row.label}</span>
        </span>
      ))}
    </div>
  );
}

function StepHighlight({ step, alignEnd = false }: { step: ExplainStep; alignEnd?: boolean }) {
  const t = TONE[step.tone];
  const formula = "formula" in step ? step.formula : undefined;
  const bullets = "bullets" in step ? step.bullets : undefined;

  if (step.id === "how" && formula) {
    return (
      <div className={`mt-2.5 space-y-1.5 ${alignEnd ? "lg:flex lg:flex-col lg:items-end" : ""}`}>
        <p
          className={`inline-block rounded-lg px-4 py-2 text-sm font-semibold tabular-nums tracking-tight ${t.formula}`}
        >
          {formula}
        </p>
        <StepScoringWeights tone={step.tone} alignEnd={alignEnd} />
      </div>
    );
  }

  if (bullets && bullets.length > 0) {
    return <StepBullets items={bullets} tone={step.tone} alignEnd={alignEnd} />;
  }

  return null;
}

function TimelineNode({
  stepIndex,
  tone,
  icon: Icon,
  size = "md",
}: {
  stepIndex: number;
  tone: FamiExplainCardTone;
  icon: LucideIcon;
  size?: "md" | "sm";
}) {
  const t = TONE[tone];
  const dim = size === "sm" ? "h-9 w-9" : "h-12 w-12";
  const iconDim = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <div
      className={`relative z-2 flex shrink-0 items-center justify-center rounded-full border shadow-card ${dim} ${t.node} ${t.nodeBorder}`}
      aria-hidden
    >
      <Icon className={`${iconDim} ${t.nodeIcon}`} strokeWidth={1.75} />
      <span className="sr-only">Etapa {stepIndex}</span>
    </div>
  );
}

function TimelineStepContent({
  step,
  stepIndex,
  alignEnd = false,
  desktopCard = false,
}: {
  step: ExplainStep;
  stepIndex: number;
  alignEnd?: boolean;
  /** Limita largura só no desktop alternado. */
  desktopCard?: boolean;
}) {
  const t = TONE[step.tone];

  return (
    <article
      className={[
        "w-full rounded-xl p-4 text-left shadow-card sm:p-5",
        t.panelTint,
        desktopCard ? "lg:max-w-104" : "max-w-none",
        alignEnd ? "lg:text-right" : "",
      ].join(" ")}
    >
      <p className={`text-xs font-medium uppercase tracking-wider ${t.accent}`}>
        Etapa {stepIndex}
      </p>
      <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight text-slate-900">
        {step.title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
      <StepHighlight step={step} alignEnd={alignEnd} />
    </article>
  );
}

function FamiExplainTimelineStep({
  step,
  index,
}: {
  step: ExplainStep;
  index: number;
}) {
  const Icon = STEP_ICONS[step.id];
  const stepNum = index + 1;
  const alignRight = index % 2 === 0;

  return (
    <li className={TIMELINE_SCALE.stepPad}>
      {/* Mobile + tablet: trilho à esquerda, conteúdo na coluna direita */}
      <div className={`lg:hidden ${TIMELINE_SCALE.railGrid}`}>
        <div className="flex justify-center pt-1">
          <TimelineNode stepIndex={stepNum} tone={step.tone} icon={Icon} />
        </div>
        <div className="min-w-0">
          <TimelineStepContent step={step} stepIndex={stepNum} />
        </div>
      </div>

      {/* Desktop: alternância esquerda/direita */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_3rem_minmax(0,1fr)] lg:items-center lg:gap-x-2">
        <div className="flex justify-center lg:col-start-2">
          <TimelineNode stepIndex={stepNum} tone={step.tone} icon={Icon} />
        </div>

        <div
          className={[
            "min-w-0 lg:row-start-1",
            alignRight
              ? "lg:col-start-3 lg:flex lg:justify-start lg:pl-1"
              : "lg:col-start-1 lg:flex lg:justify-end lg:pr-1",
          ].join(" ")}
        >
          <TimelineStepContent
            step={step}
            stepIndex={stepNum}
            alignEnd={!alignRight}
            desktopCard
          />
        </div>

        <div
          className={["hidden lg:block", alignRight ? "lg:col-start-1" : "lg:col-start-3"].join(
            " ",
          )}
          aria-hidden
        />
      </div>
    </li>
  );
}

/** Timeline vertical — apenas “Entenda o FAMI”. */
function FamiExplainTimeline() {
  return (
    <div className={`relative mx-auto ${TIMELINE_SCALE.wrap}`}>
      {/* Linha contínua — mobile + tablet (eixo esquerdo) */}
      <div
        className={`${TIMELINE_SCALE.spine} ${TIMELINE_SCALE.spineAxisLeft} top-6 bottom-6 lg:hidden`}
        aria-hidden
      />
      {/* Linha contínua — desktop (centro) */}
      <div
        className={`${TIMELINE_SCALE.spine} bottom-6 left-1/2 top-6 hidden lg:block`}
        aria-hidden
      />

      <ol className="relative z-1">
        {FAMI_EXPLAIN_CARDS.map((step, index) => (
          <FamiExplainTimelineStep key={step.id} step={step} index={index} />
        ))}
      </ol>
    </div>
  );
}

/** Versão compacta (guia recolhido). */
function FamiExplainTimelineCompact() {
  return (
    <div className="relative">
      <div
        className={`${TIMELINE_SCALE.spine} ${TIMELINE_SCALE.spineAxisLeft} top-4 bottom-4`}
        aria-hidden
      />
      <ol className="relative z-1 grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-4">
        {FAMI_EXPLAIN_CARDS.map((step, index) => {
          const Icon = STEP_ICONS[step.id];
          const t = TONE[step.tone];
          const isLast = index === FAMI_EXPLAIN_CARDS.length - 1;
          const rowPad = isLast ? "" : "pb-3";

          return (
            <li key={step.id} className="contents">
              <div className={`flex justify-center pt-0.5 ${rowPad}`}>
                <TimelineNode
                  stepIndex={index + 1}
                  tone={step.tone}
                  icon={Icon}
                  size="sm"
                />
              </div>
              <div className={`min-w-0 ${rowPad}`}>
                <p className={`text-xs font-medium uppercase tracking-wider ${t.accent}`}>
                  Etapa {index + 1}
                </p>
                <p className="mt-0.5 text-base font-semibold leading-snug text-slate-900">
                  {step.title}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function FamiMethodologyGuide({
  defaultExpanded = false,
  currentLevel = null,
  className = "",
}: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <PanelSection
      title="Entenda o FAMI"
      description={FAMI_GUIDE_INTRO}
      variant="card"
      className={className}
      contentClassName="space-y-0"
      actions={
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`${formSurface.secondaryButtonSm} inline-flex items-center gap-1.5`}
          aria-expanded={expanded}
        >
          {expanded ? "Ocultar" : "Expandir guia"}
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      }
    >
      {expanded ? (
        <div
          className={`${formSurface.dashboardPanel} isolate overflow-hidden p-6 sm:p-8 md:p-9`}
        >
          <FamiExplainTimeline />

          <div className="relative z-0 mt-10 overflow-hidden border-t border-slate-100 pt-9 sm:mt-12 sm:pt-10">
            <FamiMaturityRoadmap currentLevel={currentLevel} />
          </div>
        </div>
      ) : (
        <div className={`${formSurface.dashboardPanel} p-6 sm:p-7`}>
          <FamiExplainTimelineCompact />
        </div>
      )}
    </PanelSection>
  );
}
