"use client";

import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import {
  LEVEL_META,
  levelFromPercentage,
} from "@/lib/fami/respondent-presentation";
import type { FamiSectionSnapshot } from "@/lib/fami/queries";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  sections: FamiSectionSnapshot[];
};

type SortKey = "name" | "percentage" | "level";

function progressColor(percentage: number): string {
  if (percentage >= 75) return "bg-emerald-500";
  if (percentage >= 50) return "bg-sky-500";
  if (percentage >= 25) return "bg-amber-500";
  return "bg-rose-500";
}

export function RespondentFamiSectionList({ sections }: Props) {
  const [sort, setSort] = useState<SortKey>("percentage");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    const factor = direction === "asc" ? 1 : -1;
    return [...sections].sort((a, b) => {
      if (sort === "name") {
        return a.sectionName.localeCompare(b.sectionName, "pt-BR") * factor;
      }
      if (sort === "level") {
        return ((a.maturityLevel ?? 0) - (b.maturityLevel ?? 0)) * factor;
      }
      return (a.percentage - b.percentage) * factor;
    });
  }, [sections, sort, direction]);

  function toggleSort(next: SortKey) {
    if (sort === next) {
      setDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(next);
      setDirection(next === "name" ? "asc" : "desc");
    }
  }

  if (sections.length === 0) {
    return (
      <div className={formSurface.empty.container}>
        <p className={formSurface.empty.description}>Sem dados por seção nesta versão.</p>
      </div>
    );
  }

  return (
    <section aria-label="Visão por seção" className={formSurface.card}>
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 px-5 py-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">Por seção</p>
          <p className="text-xs text-slate-500">
            Detalhamento da maturidade dentro de cada eixo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-micro text-slate-500">
          <span className="uppercase tracking-wider">Ordenar:</span>
          {(
            [
              { id: "percentage" as const, label: "Pontuação" },
              { id: "level" as const, label: "Nível" },
              { id: "name" as const, label: "Nome" },
            ] satisfies { id: SortKey; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => toggleSort(opt.id)}
              aria-pressed={sort === opt.id}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium transition ${
                sort === opt.id
                  ? "bg-brand-50 text-brand-800 ring-1 ring-brand-200"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
              {sort === opt.id ? (
                <ArrowUpDown className="h-3 w-3" aria-hidden />
              ) : null}
            </button>
          ))}
        </div>
      </header>
      <ul className="divide-y divide-slate-100">
        {sorted.map((section) => {
          const lvl = section.maturityLevel
            ? LEVEL_META[Math.max(1, Math.min(5, section.maturityLevel)) as 1 | 2 | 3 | 4 | 5]
            : LEVEL_META[levelFromPercentage(section.percentage)];
          return (
            <li key={section.sectionId} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:gap-4">
              <div className="min-w-0 flex-1">
                <p
                  className="line-clamp-1 text-sm font-semibold text-slate-800"
                  title={section.sectionName}
                >
                  {section.sectionName}
                </p>
                <p className="text-micro text-slate-500">
                  {section.pointsObtained.toFixed(2)} / {section.pointsPossible.toFixed(2)} pontos
                </p>
              </div>
              <div className="flex w-full max-w-md items-center gap-3">
                <div className="flex-1">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-1.5 rounded-full transition-all ${progressColor(section.percentage)}`}
                      style={{ width: `${section.percentage}%` }}
                    />
                  </div>
                </div>
                <span className="w-14 text-right text-sm font-bold tabular-nums text-slate-900">
                  {section.percentage.toFixed(1)}%
                </span>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-semibold ${lvl.badgeClasses}`}
                >
                  N{lvl.level}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
