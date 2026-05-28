"use client";

import { Target } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import { levelMeta, goalProgress } from "@/lib/fami/respondent-presentation";

type Props = {
  percentage: number;
  level: number;
  pointsObtained?: number;
  pointsPossible?: number;
  goalTarget?: number;
};

const RADIUS = 64;
const STROKE = 12;
const CIRC = 2 * Math.PI * RADIUS;

/**
 * Anel radial moderno para a pontuacao FAMI global.
 * Cor do anel acompanha a metadata do nivel atual.
 */
export function RespondentFamiGlobalScore({
  percentage,
  level,
  pointsObtained,
  pointsPossible,
  goalTarget = 75,
}: Props) {
  const safe = Math.max(0, Math.min(100, percentage));
  const dash = (safe / 100) * CIRC;
  const meta = levelMeta(level);
  const goal = goalProgress(safe, goalTarget);

  return (
    <section className={`${formSurface.nestedCard} flex flex-col items-center gap-3 md:flex-row md:items-stretch md:justify-between`}>
      <div className="relative flex h-44 w-44 items-center justify-center">
        <svg
          width="176"
          height="176"
          viewBox="0 0 160 160"
          role="img"
          aria-label={`Pontuação FAMI ${safe.toFixed(1)}%`}
        >
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={STROKE}
          />
          <circle
            cx="80"
            cy="80"
            r={RADIUS}
            fill="none"
            className={meta.ringColor}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${CIRC - dash}`}
            transform="rotate(-90 80 80)"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-3xl font-bold tabular-nums ${meta.textColor}`}>
            {safe.toFixed(1)}%
          </span>
          <span className="text-micro uppercase tracking-wider text-slate-500">
            Pontuação FAMI
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">
        <div>
          <p className="text-micro uppercase tracking-wider text-slate-500">
            Nível atual
          </p>
          <p className={`mt-0.5 text-lg font-semibold ${meta.textColor}`}>
            {meta.label}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-slate-600">
            {meta.description}
          </p>
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between text-micro uppercase tracking-wider text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Target className="h-3 w-3" aria-hidden />
              Meta de maturidade (≥ {goalTarget}%)
            </span>
            <span
              className={`font-semibold ${
                goal.achieved ? "text-emerald-700" : "text-slate-700"
              }`}
            >
              {goal.achieved
                ? "Meta atingida"
                : `Faltam ${goal.distance.toFixed(1)} p.p.`}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-1.5 rounded-full transition-all ${
                goal.achieved ? "bg-emerald-500" : "bg-sky-500"
              }`}
              style={{ width: `${Math.min(100, (safe / goalTarget) * 100)}%` }}
            />
          </div>
          {typeof pointsObtained === "number" && typeof pointsPossible === "number" ? (
            <p className="text-micro text-slate-500">
              {pointsObtained.toFixed(2)} / {pointsPossible.toFixed(2)} pontos elegíveis
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
