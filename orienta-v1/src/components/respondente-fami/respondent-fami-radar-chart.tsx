"use client";

import type { AxisMaturity } from "@/lib/fami/types";
import { formSurface } from "@/lib/form-surface";

type Props = {
  axes: AxisMaturity[];
  title?: string;
  /** Sem borda dupla quando dentro de painel analítico. */
  embedded?: boolean;
};

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 48;
const RINGS = [25, 50, 75, 100];

function pointFor(i: number, total: number, value: number): { x: number; y: number } {
  const angle = (Math.PI * 2 * i) / total - Math.PI / 2;
  const r = (value / 100) * RADIUS;
  return {
    x: CENTER + r * Math.cos(angle),
    y: CENTER + r * Math.sin(angle),
  };
}

/**
 * Radar SVG dos eixos do FAMI. Mostra a maturidade em escala 0-100,
 * com anéis de referência em 25/50/75/100%.
 */
export function RespondentFamiRadarChart({ axes, title, embedded = false }: Props) {
  if (axes.length < 3) {
    return (
      <div className={formSurface.empty.container}>
        <p className={formSurface.empty.description}>
          São necessários ao menos 3 eixos para gerar o radar de maturidade.
        </p>
      </div>
    );
  }
  const n = axes.length;
  const polygon = axes
    .map((axis, i) => {
      const p = pointFor(i, n, Math.max(0, Math.min(100, axis.percentage)));
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure
      className={
        embedded
          ? "flex h-full min-h-[20rem] flex-col justify-center p-2 sm:p-3"
          : `p-5 ${formSurface.card}`
      }
    >
      {title ? (
        <figcaption className="mb-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {title}
        </figcaption>
      ) : null}
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="Radar de maturidade por eixo"
        className="mx-auto h-auto w-full max-w-md"
      >
        {RINGS.map((r) => {
          const points = axes
            .map((_, i) => {
              const p = pointFor(i, n, r);
              return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
            })
            .join(" ");
          return (
            <polygon
              key={r}
              points={points}
              fill="none"
              stroke="#e2e8f0"
              strokeDasharray="3 3"
            />
          );
        })}

        {axes.map((axis, i) => {
          const p = pointFor(i, n, 100);
          return (
            <line
              key={`axis-${axis.axisName}-${i}`}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              stroke="#e2e8f0"
            />
          );
        })}

        <polygon
          points={polygon}
          fill="rgba(14, 165, 233, 0.18)"
          stroke="#0ea5e9"
          strokeWidth={2}
          strokeLinejoin="round"
        />

        {axes.map((axis, i) => {
          const p = pointFor(i, n, Math.max(0, Math.min(100, axis.percentage)));
          return (
            <circle
              key={`pt-${axis.axisName}-${i}`}
              cx={p.x}
              cy={p.y}
              r={3.5}
              fill="#0ea5e9"
              stroke="#fff"
              strokeWidth={1}
            />
          );
        })}

        {axes.map((axis, i) => {
          const labelPos = pointFor(i, n, 112);
          const anchor =
            labelPos.x < CENTER - 5 ? "end" : labelPos.x > CENTER + 5 ? "start" : "middle";
          return (
            <g key={`lbl-${axis.axisName}-${i}`}>
              <text
                x={labelPos.x}
                y={labelPos.y}
                textAnchor={anchor}
                fontSize="10"
                fill="#0f172a"
                fontWeight={600}
              >
                {axis.axisName}
              </text>
              <text
                x={labelPos.x}
                y={labelPos.y + 12}
                textAnchor={anchor}
                fontSize="10"
                fill="#475569"
              >
                {axis.percentage.toFixed(1)}%
              </text>
            </g>
          );
        })}

        {RINGS.map((r) => {
          const angle = -Math.PI / 2;
          const x = CENTER + (r / 100) * RADIUS * Math.cos(angle);
          const y = CENTER + (r / 100) * RADIUS * Math.sin(angle);
          return (
            <text key={`ring-${r}`} x={x + 4} y={y + 3} fontSize="9" fill="#94a3b8">
              {r}%
            </text>
          );
        })}
      </svg>
    </figure>
  );
}
