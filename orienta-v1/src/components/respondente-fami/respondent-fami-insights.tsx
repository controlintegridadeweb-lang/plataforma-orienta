"use client";

import type { FamiInsightCard } from "@/lib/fami/respondent-presentation";
import { formSurface } from "@/lib/form-surface";

type Props = {
  summary: string;
  cards: FamiInsightCard[];
};

const KIND_LABEL: Record<FamiInsightCard["kind"], string> = {
  strength: "Ponto forte",
  weakness: "Ponto crítico",
  opportunity: "Oportunidade",
  risk: "Risco institucional",
  neutral: "Leitura",
};

const KIND_STYLE: Record<
  FamiInsightCard["kind"],
  { badge: string; accent: string; surface: string }
> = {
  strength: {
    badge: "bg-emerald-50/90 text-emerald-800 ring-emerald-100/80",
    accent: "border-l-emerald-400",
    surface: "bg-emerald-50/20",
  },
  weakness: {
    badge: "bg-rose-50/90 text-rose-800 ring-rose-100/80",
    accent: "border-l-rose-400",
    surface: "bg-rose-50/15",
  },
  opportunity: {
    badge: "bg-sky-50/90 text-sky-800 ring-sky-100/80",
    accent: "border-l-sky-400",
    surface: "bg-sky-50/15",
  },
  risk: {
    badge: "bg-amber-50/90 text-amber-900 ring-amber-100/80",
    accent: "border-l-amber-500",
    surface: "bg-amber-50/15",
  },
  neutral: {
    badge: "bg-slate-100/90 text-slate-700 ring-slate-200/80",
    accent: "border-l-slate-300",
    surface: "bg-slate-50/40",
  },
};

export function RespondentFamiInsights({ summary, cards }: Props) {
  return (
    <section className={`space-y-0 ${formSurface.card}`}>
      <header className="border-b border-slate-100 px-5 py-4 sm:px-6">
        <p className="text-sm font-semibold tracking-normal text-slate-900">
          Interpretação automática da maturidade
        </p>
        <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{summary}</p>
      </header>

      {cards.length > 0 ? (
        <ul className="grid auto-rows-fr gap-3 p-4 sm:grid-cols-2 sm:gap-4 sm:p-5 lg:grid-cols-3">
          {cards.map((card) => {
            const style = KIND_STYLE[card.kind];
            return (
              <li
                key={card.id}
                className={`flex h-full min-h-30 flex-col rounded-lg border border-slate-200/60 border-l-3 p-4 shadow-card ${style.accent} ${style.surface}`}
              >
                <span
                  className={`inline-flex w-fit rounded-md px-2 py-0.5 text-2xs font-semibold uppercase tracking-wider ring-1 ${style.badge}`}
                >
                  {KIND_LABEL[card.kind]}
                </span>
                <p className="mt-2.5 text-sm font-medium leading-snug text-slate-900">
                  {card.title}
                </p>
                <p className="mt-1.5 flex-1 text-xs leading-relaxed text-slate-600">
                  {card.description}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-5 py-4 text-xs text-slate-500 sm:px-6">
          Ainda há poucos dados para gerar interpretações.
        </p>
      )}
    </section>
  );
}
