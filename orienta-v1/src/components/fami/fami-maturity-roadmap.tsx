"use client";

import Image from "next/image";
import {
  FAMI_LEVEL_THRESHOLDS,
  FAMI_MATURITY_JOURNEY_SUMMARY,
  famiLevelIllustrationPath,
} from "@/lib/fami/methodology-content";
import { LEVEL_META, type FamiLevel } from "@/lib/fami/respondent-presentation";

/** Estrutura fixa — baseline uniforme entre os 5 cards. */
const CARD = {
  height: "h-[34.5rem] sm:h-[35.5rem]",
  header: "h-[10.75rem] sm:h-[11.5rem]",
  illus: "h-[15rem] sm:h-[15.75rem]",
  footer: "min-h-[3.75rem]",
} as const;

/** Uma cor sólida por nível (topo colorido + tipografia harmonizada). */
type JourneyTone = {
  headerBg: string;
  stepNumber: string;
  title: string;
  range: string;
  desc: string;
};

const JOURNEY_TONE: Record<FamiLevel, JourneyTone> = {
  1: {
    headerBg: "bg-rose-50",
    stepNumber: "text-rose-200",
    title: "text-rose-950",
    range: "text-rose-800/75",
    desc: "text-rose-950/55",
  },
  2: {
    headerBg: "bg-[#F7F2E8]",
    stepNumber: "text-[#E8DFD0]",
    title: "text-amber-950",
    range: "text-amber-900/65",
    desc: "text-amber-950/55",
  },
  3: {
    headerBg: "bg-sky-50",
    stepNumber: "text-sky-200",
    title: "text-slate-800",
    range: "text-sky-900/60",
    desc: "text-slate-700/70",
  },
  4: {
    headerBg: "bg-violet-50",
    stepNumber: "text-violet-200",
    title: "text-violet-950",
    range: "text-violet-800/65",
    desc: "text-violet-950/55",
  },
  5: {
    headerBg: "bg-emerald-50",
    stepNumber: "text-emerald-200",
    title: "text-emerald-950",
    range: "text-emerald-800/65",
    desc: "text-emerald-950/55",
  },
};

type Props = {
  currentLevel?: number | null;
  className?: string;
};

function normalizeLevel(level: number | null | undefined): FamiLevel | null {
  if (level == null || level < 1 || level > 5) return null;
  return level as FamiLevel;
}

function JourneyStepCard({
  level,
  isCurrent,
  isPast,
}: {
  level: FamiLevel;
  isCurrent: boolean;
  isPast: boolean;
}) {
  const meta = LEVEL_META[level];
  const tone = JOURNEY_TONE[level];
  const summary = FAMI_MATURITY_JOURNEY_SUMMARY[level];

  return (
    <article
      className={[
        "relative flex w-full flex-col overflow-hidden rounded-2xl border bg-white transition-[border-color,box-shadow] duration-200",
        CARD.height,
        isCurrent
          ? "border-brand-400/80 shadow-[var(--shadow-card-hover)]"
          : "border-stone-200/90 shadow-[var(--shadow-card)] hover:border-stone-300",
        isPast && !isCurrent ? "opacity-[0.94]" : "",
      ].join(" ")}
      aria-current={isCurrent ? "step" : undefined}
    >
      {isCurrent ? (
        <span className="absolute right-3 top-3 z-[2] rounded-full bg-white/95 px-2.5 py-0.5 text-[10px] font-medium text-brand-800 ring-1 ring-brand-200/90">
          Seu nível
        </span>
      ) : null}

      {/* Header colorido — protagonismo do número e respiro vertical */}
      <header
        className={`flex shrink-0 flex-col items-center justify-center px-5 py-6 text-center sm:px-6 sm:py-7 ${CARD.header} ${tone.headerBg}`}
      >
        <p
          className={`select-none text-[4.25rem] font-medium leading-none tabular-nums sm:text-[4.75rem] ${tone.stepNumber}`}
          aria-hidden
        >
          {level}
        </p>
        <h3
          className={`mt-4 text-[15px] font-semibold leading-snug tracking-tight sm:mt-5 sm:text-base ${tone.title}`}
        >
          {meta.shortLabel}
        </h3>
        <p className={`mt-2.5 text-xs font-normal tabular-nums sm:mt-3 ${tone.range}`}>
          {meta.range}
        </p>
      </header>

      {/* Corpo branco — ilustração + descrição */}
      <div className="flex min-h-0 flex-1 flex-col bg-white">
        <div
          className={`flex shrink-0 items-center justify-center px-2 pt-2 sm:px-3 ${CARD.illus}`}
        >
          <Image
            src={famiLevelIllustrationPath(level)}
            alt=""
            width={480}
            height={360}
            sizes="(max-width: 640px) 340px, 420px"
            className="h-full w-full max-h-full max-w-full object-contain"
            priority={level <= 2}
          />
        </div>

        <div
          className={`flex shrink-0 items-start justify-center px-5 pb-5 pt-1 text-center ${CARD.footer}`}
        >
          <p className={`max-w-[16rem] text-xs leading-relaxed ${tone.desc}`}>{summary}</p>
        </div>
      </div>
    </article>
  );
}

/** Jornada horizontal de maturidade institucional (roadmap visual). */
export function FamiMaturityRoadmap({ currentLevel, className = "" }: Props) {
  const active = normalizeLevel(currentLevel);

  return (
    <div className={`relative isolate overflow-hidden space-y-5 ${className}`.trim()}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Jornada de maturidade
          </p>
          <p className="mt-1 max-w-xl text-sm text-slate-600">
            Cinco etapas de evolução — da estrutura inicial à governança madura.
          </p>
        </div>
        {active != null ? (
          <p className="text-xs text-slate-500">
            Destaque:{" "}
            <span className="font-medium text-brand-700">
              Nível {active} · {LEVEL_META[active].shortLabel}
            </span>
          </p>
        ) : null}
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute left-[4%] right-[4%] top-[11.75rem] z-0 hidden h-px bg-stone-200/90 lg:block"
          aria-hidden
        />

        <div className="overflow-x-auto overflow-y-hidden overscroll-x-contain pb-1 scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] lg:pb-0">
          <ol
            className="relative z-[1] flex min-w-[min(100%,60rem)] items-stretch gap-3 sm:min-w-[70rem] sm:gap-3.5 lg:min-w-0 lg:grid lg:grid-cols-5 lg:gap-3.5"
            aria-label="Progressão dos níveis de maturidade FAMI"
          >
            {FAMI_LEVEL_THRESHOLDS.map(({ level }) => {
              const step = level as FamiLevel;
              const isCurrent = active === step;
              const isPast = active != null && step < active;

              return (
                <li
                  key={level}
                  className="flex min-w-[14.5rem] max-w-[16.5rem] flex-1 snap-center sm:min-w-[15.25rem] lg:min-w-0 lg:max-w-none"
                >
                  <JourneyStepCard level={step} isCurrent={isCurrent} isPast={isPast} />
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </div>
  );
}
