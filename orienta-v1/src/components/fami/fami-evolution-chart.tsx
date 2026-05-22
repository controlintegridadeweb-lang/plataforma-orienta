"use client";

import { formSurface } from "@/lib/form-surface";
import type { FamiEvolutionPoint, FamiEvolutionYearPoint } from "@/lib/fami/queries";

const AXIS_LINE_COLORS = ["#0f766e", "#ea580c", "#15803d", "#7c3aed", "#0369a1"];

type ChartRow = {
  xLabel: string;
  xKey: string;
  globalPercentage: number | null;
  axisPercentages: Record<string, number>;
};

type Props =
  | { variant: "versions"; data: FamiEvolutionPoint[] }
  | { variant: "years"; data: FamiEvolutionYearPoint[] };

function normalizeRows(props: Props): ChartRow[] {
  if (props.variant === "versions") {
    return [...props.data]
      .sort((a, b) => a.processingVersion - b.processingVersion)
      .map((pt) => ({
        xLabel: `v${pt.processingVersion}`,
        xKey: `v-${pt.processingVersion}-${pt.createdAt}`,
        globalPercentage: pt.globalPercentage,
        axisPercentages: pt.axisPercentages,
      }));
  }
  return [...props.data]
    .sort((a, b) => a.year - b.year)
    .map((pt) => ({
      xLabel: String(pt.year),
      xKey: `y-${pt.year}-${pt.processingVersion}`,
      globalPercentage: pt.globalPercentage,
      axisPercentages: pt.axisPercentages,
    }));
}

export function FamiEvolutionChart(props: Props) {
  const data = normalizeRows(props);

  if (data.length === 0) {
    return (
      <p className={`${formSurface.messageNeutral} border-dashed text-slate-600`}>
        Sem historico FAMI para este formulario e organizacao.
      </p>
    );
  }

  if (data.length === 1) {
    return (
      <p className="rounded-lg border border-slate-200/90 bg-slate-50/90 px-4 py-3 text-sm leading-relaxed text-slate-700">
        Há apenas um período registrado ({data[0]!.xLabel}). A comparação será exibida após novos
        fechamentos ou processamentos.
      </p>
    );
  }

  const axisNames = Array.from(
    data.reduce((set, pt) => {
      for (const k of Object.keys(pt.axisPercentages)) set.add(k);
      return set;
    }, new Set<string>()),
  );

  const width = 520;
  const height = 280;
  const padding = { top: 24, right: 24, bottom: 48, left: 44 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const n = data.length;
  const xAt = (i: number) => padding.left + (i / Math.max(1, n - 1)) * innerWidth;

  const ticks = [0, 25, 50, 75, 100];

  function linePath(getter: (pt: ChartRow) => number | null) {
    const parts: string[] = [];
    for (let i = 0; i < data.length; i++) {
      const v = getter(data[i]!);
      if (v == null || Number.isNaN(v)) continue;
      const x = xAt(i);
      const y = padding.top + innerHeight - (v / 100) * innerHeight;
      parts.push(`${parts.length === 0 ? "M" : "L"} ${x} ${y}`);
    }
    return parts.join(" ");
  }

  const globalPath = linePath((pt) => pt.globalPercentage);
  const axisPaths = axisNames.map((name, idx) => ({
    name,
    path: linePath((pt) => pt.axisPercentages[name] ?? null),
    color: AXIS_LINE_COLORS[idx % AXIS_LINE_COLORS.length],
  }));

  const aria =
    props.variant === "years" ? "Evolucao FAMI por ano civil" : "Evolucao FAMI por versao";

  return (
    <div className="space-y-2">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={aria}
        className="h-auto w-full max-w-full"
      >
        {ticks.map((tick) => {
          const y = padding.top + innerHeight - (tick / 100) * innerHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                x2={padding.left + innerWidth}
                y1={y}
                y2={y}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#64748b">
                {tick}%
              </text>
            </g>
          );
        })}

        {axisPaths.map((ap) =>
          ap.path ? (
            <path
              key={ap.name}
              d={ap.path}
              fill="none"
              stroke={ap.color}
              strokeWidth={1.5}
              strokeDasharray="6 4"
              opacity={0.85}
            />
          ) : null,
        )}

        {globalPath ? (
          <path
            d={globalPath}
            fill="none"
            stroke="#0f172a"
            strokeWidth={2.5}
            strokeLinecap="round"
          />
        ) : null}

        {data.map((pt, i) => {
          const x = xAt(i);
          const gv = pt.globalPercentage;
          if (gv == null) return null;
          const y = padding.top + innerHeight - (gv / 100) * innerHeight;
          return <circle key={pt.xKey} cx={x} cy={y} r={4} fill="#0f172a" />;
        })}

        {data.map((pt, i) => {
          const x = xAt(i);
          return (
            <text
              key={`lbl-${pt.xKey}`}
              x={x}
              y={height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="#475569"
            >
              {pt.xLabel}
            </text>
          );
        })}
      </svg>
      <div className="flex flex-wrap gap-3 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-0.5 w-4 bg-slate-900" aria-hidden />
          Global
        </span>
        {axisNames.map((name, idx) => (
          <span key={name} className="inline-flex items-center gap-1">
            <span
              className="inline-block h-0.5 w-4 border-t-2 border-dashed"
              style={{ borderColor: AXIS_LINE_COLORS[idx % AXIS_LINE_COLORS.length] }}
              aria-hidden
            />
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}
