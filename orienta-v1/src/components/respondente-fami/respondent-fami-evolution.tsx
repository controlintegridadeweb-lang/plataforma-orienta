"use client";

import { ArrowDownRight, ArrowUpRight, Minus, Sparkles } from "lucide-react";
import type { FamiEvolutionPoint, FamiEvolutionYearPoint } from "@/lib/fami/queries";
import { levelFromPercentage, LEVEL_META } from "@/lib/fami/respondent-presentation";
import { formSurface } from "@/lib/form-surface";

type Props =
  | { granularity: "versions"; points: FamiEvolutionPoint[] }
  | { granularity: "years"; points: FamiEvolutionYearPoint[] };

type NormalizedEvolutionPt = {
  sortKey: number;
  subtitle: string;
  xTick: string;
  globalPercentage: number | null;
  axisPercentages: Record<string, number>;
  createdAt: string;
};

function normalizePts(props: Props): NormalizedEvolutionPt[] {
  if (props.granularity === "versions") {
    return [...props.points]
      .sort((a, b) => a.processingVersion - b.processingVersion)
      .map((p) => ({
        sortKey: p.processingVersion,
        subtitle: `v${p.processingVersion}`,
        xTick: `v${p.processingVersion}`,
        globalPercentage: p.globalPercentage,
        axisPercentages: p.axisPercentages,
        createdAt: p.createdAt,
      }));
  }
  return [...props.points]
    .sort((a, b) => a.year - b.year)
    .map((p) => ({
      sortKey: p.year,
      subtitle: `${p.year}`,
      xTick: String(p.year),
      globalPercentage: p.globalPercentage,
      axisPercentages: p.axisPercentages,
      createdAt: p.createdAt,
    }));
}

const AXIS_LINE_COLORS = ["#0f766e", "#ea580c", "#7c3aed", "#0369a1", "#be123c", "#15803d"];

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function trendIcon(delta: number) {
  if (delta > 0.5)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
        <ArrowUpRight className="h-3 w-3" aria-hidden />+{delta.toFixed(1)} p.p.
      </span>
    );
  if (delta < -0.5)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700">
        <ArrowDownRight className="h-3 w-3" aria-hidden />
        {delta.toFixed(1)} p.p.
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
      <Minus className="h-3 w-3" aria-hidden />
      Estável
    </span>
  );
}

export function RespondentFamiEvolution(props: Props) {
  const granularity = props.granularity;
  const sorted = normalizePts(props);

  if (sorted.length === 0) {
    return (
      <section className={formSurface.empty.container}>
        <Sparkles className="h-6 w-6 text-slate-400" aria-hidden />
        <p className={formSurface.empty.title}>Sem histórico de processamentos.</p>
        <p className={formSurface.empty.description}>
          {granularity === "years"
            ? "Comparando anos aparece após processamentos registrados em exercícios distintos (ano civil BRT)."
            : "Conforme novas versões forem processadas, sua evolução de maturidade aparecerá aqui."}
        </p>
      </section>
    );
  }

  if (sorted.length === 1) {
    const pt = sorted[0]!;
    return (
      <section className={`p-5 ${formSurface.card}`}>
        <p className="text-sm font-semibold text-slate-900">
          {granularity === "years" ? "Primeiro ano com fechamento" : "Primeiro processamento registrado"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {granularity === "years" ? `Ano ${pt.subtitle}` : pt.subtitle} ·{" "}
          {formatDateTime(pt.createdAt)} ·{" "}
          {pt.globalPercentage != null ? `${pt.globalPercentage.toFixed(1)}%` : "—"}
        </p>
        <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-600">
          {granularity === "years"
            ? "Compare anos após processamentos registrados em exercícios distintos."
            : "A evolução comparativa aparece após pelo menos dois processamentos."}
        </p>
      </section>
    );
  }

  const axisNames = Array.from(
    sorted.reduce((set, p) => {
      for (const k of Object.keys(p.axisPercentages)) set.add(k);
      return set;
    }, new Set<string>()),
  );

  const width = 720;
  const height = 280;
  const padding = { top: 20, right: 24, bottom: 40, left: 44 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;
  const n = sorted.length;
  const xAt = (i: number) => padding.left + (i / Math.max(1, n - 1)) * innerW;
  const yAt = (v: number) => padding.top + innerH - (v / 100) * innerH;

  function linePath(get: (pt: NormalizedEvolutionPt) => number | null) {
    const parts: string[] = [];
    sorted.forEach((p, i) => {
      const v = get(p);
      if (v == null || Number.isNaN(v)) return;
      parts.push(`${parts.length === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`);
    });
    return parts.join(" ");
  }

  function areaPath() {
    const parts: string[] = [];
    sorted.forEach((p, i) => {
      const v = p.globalPercentage;
      if (v == null) return;
      parts.push(`${parts.length === 0 ? "M" : "L"} ${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`);
    });
    if (parts.length === 0) return "";
    const lastIdx = sorted.length - 1;
    const last = sorted[lastIdx]?.globalPercentage;
    const firstWithValue = sorted.findIndex((p) => p.globalPercentage != null);
    if (firstWithValue < 0 || last == null) return parts.join(" ");
    return [
      ...parts,
      `L ${xAt(lastIdx).toFixed(1)} ${yAt(0).toFixed(1)}`,
      `L ${xAt(firstWithValue).toFixed(1)} ${yAt(0).toFixed(1)}`,
      "Z",
    ].join(" ");
  }

  const globalPath = linePath((p) => p.globalPercentage);
  const globalArea = areaPath();

  const variations = sorted.map((pt, i) => {
    const prev = i > 0 ? sorted[i - 1] : null;
    const delta =
      prev?.globalPercentage != null && pt.globalPercentage != null
        ? Math.round((pt.globalPercentage - prev.globalPercentage) * 10) / 10
        : null;
    return { pt, delta };
  });

  const ariaLabel =
    granularity === "years" ? "Evolução FAMI comparando anos" : "Evolução FAMI ao longo das versões";

  const headerSubtitle =
    granularity === "years"
      ? "Fechamento anual BRT: maior versão por ano civil; último ciclo dentro de cada ano."
      : "Variação da pontuação geral e de cada eixo entre as versões processadas.";

  return (
    <section className={`space-y-4 p-5 ${formSurface.card}`}>
      <header>
        <p className="text-sm font-semibold text-slate-900">Evolução da maturidade</p>
        <p className="text-xs text-slate-500">{headerSubtitle}</p>
      </header>
      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={ariaLabel}
          className="h-auto w-full min-w-[480px]"
        >
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line
                x1={padding.left}
                x2={padding.left + innerW}
                y1={yAt(t)}
                y2={yAt(t)}
                stroke="#e2e8f0"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={yAt(t) + 4}
                textAnchor="end"
                fontSize="10"
                fill="#64748b"
              >
                {t}%
              </text>
            </g>
          ))}

          {globalArea ? (
            <path d={globalArea} fill="rgba(15, 23, 42, 0.06)" stroke="none" />
          ) : null}

          {axisNames.map((name, idx) => {
            const d = linePath((pt) => pt.axisPercentages[name] ?? null);
            if (!d) return null;
            return (
              <path
                key={name}
                d={d}
                fill="none"
                stroke={AXIS_LINE_COLORS[idx % AXIS_LINE_COLORS.length]}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                opacity={0.85}
              />
            );
          })}

          {globalPath ? (
            <path
              d={globalPath}
              fill="none"
              stroke="#0f172a"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
          ) : null}

          {sorted.map((pt, i) => {
            const v = pt.globalPercentage;
            if (v == null) return null;
            return (
              <g key={`${pt.sortKey}-${pt.createdAt}`}>
                <circle cx={xAt(i)} cy={yAt(v)} r={4} fill="#0f172a" />
                <text
                  x={xAt(i)}
                  y={height - 16}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#475569"
                >
                  {pt.xTick}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600">
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

      <section aria-label={granularity === "years" ? "Histórico por ano" : "Histórico de processamentos"}>
        <p className="mb-2 text-[11px] uppercase tracking-wider text-slate-500">Histórico</p>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {variations.map(({ pt, delta }) => {
            const pct = pt.globalPercentage ?? 0;
            const lvl = LEVEL_META[levelFromPercentage(pct)];
            return (
              <li
                key={`${granularity}-${pt.sortKey}-${pt.createdAt}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2"
              >
                <div>
                  <p className="text-xs font-semibold text-slate-900">{pt.subtitle}</p>
                  <p className="text-[10px] text-slate-500">{formatDateTime(pt.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold tabular-nums ${lvl.textColor}`}>
                    {pct.toFixed(1)}%
                  </span>
                  {delta != null ? trendIcon(delta) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </section>
  );
}
