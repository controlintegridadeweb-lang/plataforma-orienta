"use client";

import type { FamiInsightCard } from "@/lib/fami/respondent-presentation";
import { PanelSection } from "@/components/ui/panel-section";
import { typography } from "@/lib/layout/design-system";

const KIND_STYLES: Record<
  FamiInsightCard["kind"],
  { ring: string; bg: string; label: string; title: string }
> = {
  strength: {
    ring: "ring-emerald-100/80",
    bg: "bg-emerald-50/50",
    label: "Ponto forte",
    title: "text-emerald-950",
  },
  weakness: {
    ring: "ring-rose-100/80",
    bg: "bg-rose-50/45",
    label: "Ponto crítico",
    title: "text-rose-950",
  },
  opportunity: {
    ring: "ring-sky-100/80",
    bg: "bg-sky-50/50",
    label: "Oportunidade",
    title: "text-sky-950",
  },
  risk: {
    ring: "ring-amber-100/80",
    bg: "bg-amber-50/50",
    label: "Risco",
    title: "text-amber-950",
  },
  neutral: {
    ring: "ring-slate-200/80",
    bg: "bg-slate-50/70",
    label: "Observação",
    title: "text-slate-900",
  },
};

type Props = {
  summary: string;
  cards: FamiInsightCard[];
};

/** Leitura executiva institucional — insights FAMI em layout premium. */
export function FamiMaturityExecutiveInsights({ summary, cards }: Props) {
  if (!summary && cards.length === 0) return null;

  return (
    <PanelSection
      title="Insights estratégicos"
      description="Leitura executiva consolidada a partir do desempenho por eixo e da maturidade global."
      variant="card"
      contentClassName="space-y-6"
    >
      <div className={`rounded-xl border border-slate-200/80 bg-slate-50/40 px-5 py-5 sm:px-6 sm:py-6`}>
        <p className={typography.sectionLabel}>Síntese institucional</p>
        <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-700">{summary}</p>
      </div>

      {cards.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.slice(0, 3).map((card) => {
            const tone = KIND_STYLES[card.kind];
            return (
              <li
                key={card.id}
                className={`rounded-xl border border-slate-200/80 px-5 py-5 shadow-card ring-1 ${tone.ring} ${tone.bg}`}
              >
                <p className="text-micro font-semibold uppercase tracking-wide text-slate-500">
                  {tone.label}
                </p>
                <p className={`mt-2 text-sm font-semibold leading-snug ${tone.title}`}>
                  {card.title}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.description}</p>
              </li>
            );
          })}
        </ul>
      ) : null}
    </PanelSection>
  );
}
