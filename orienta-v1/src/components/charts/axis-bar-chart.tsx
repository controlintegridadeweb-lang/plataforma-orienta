import { BarChart3 } from "lucide-react";
import type { AxisMaturity } from "@/lib/fami/types";

const AXIS_COLORS: Record<string, string> = {
  Governanca: "#0f766e",
  Ambiental: "#ea580c",
  Social: "#15803d",
};

const TARGET_PCT = 70;

export function AxisBarChart({ data }: { data: AxisMaturity[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-10 text-center">
        <BarChart3 className="mx-auto h-10 w-10 text-slate-300" aria-hidden />
        <p className="text-base font-medium text-slate-700">Sem dados FAMI ainda</p>
        <p className="max-w-sm text-sm leading-relaxed text-slate-500">
          Os eixos aparecem após o próximo processamento.
        </p>
      </div>
    );
  }

  const width = 480;
  const height = 300;
  const padding = { top: 28, right: 24, bottom: 52, left: 46 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const barGap = 28;
  const barWidth = (innerWidth - barGap * (data.length - 1)) / data.length;

  const ticks = [0, 25, 50, 75, 100];
  const targetY = padding.top + innerHeight - (TARGET_PCT / 100) * innerHeight;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Maturidade por eixo"
      className="h-full w-full"
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
            <text x={padding.left - 10} y={y + 5} textAnchor="end" fontSize="12" fill="#64748b" fontWeight="500">
              {tick}%
            </text>
          </g>
        );
      })}

      <g>
        <line
          x1={padding.left}
          x2={padding.left + innerWidth}
          y1={targetY}
          y2={targetY}
          stroke="#0f766e"
          strokeDasharray="6 4"
          strokeWidth={1.2}
          opacity={0.8}
        />
        <rect
          x={padding.left + innerWidth - 72}
          y={targetY - 18}
          width={70}
          height={18}
          rx={4}
          fill="#0f766e"
          opacity={0.92}
        />
        <text
          x={padding.left + innerWidth - 37}
          y={targetY - 4}
          textAnchor="middle"
          fontSize="11"
          fontWeight={600}
          fill="#ffffff"
        >
          Meta {TARGET_PCT}%
        </text>
      </g>

      {data.map((item, index) => {
        const barHeight = Math.max(2, (item.percentage / 100) * innerHeight);
        const x = padding.left + index * (barWidth + barGap);
        const y = padding.top + innerHeight - barHeight;
        const color = AXIS_COLORS[item.axisName] ?? "#0f766e";
        return (
          <g key={(item.axisId ?? item.axisName) + item.axisName}>
            <rect
              x={x}
              y={padding.top}
              width={barWidth}
              height={innerHeight}
              fill={color}
              opacity={0.06}
              rx={4}
            />
            <rect x={x} y={y} width={barWidth} height={barHeight} fill={color} rx={4} />
            <text
              x={x + barWidth / 2}
              y={y - 8}
              textAnchor="middle"
              fontSize="14"
              fontWeight="700"
              fill="#0f172a"
            >
              {item.percentage.toFixed(0)}%
            </text>
            <text
              x={x + barWidth / 2}
              y={padding.top + innerHeight + 22}
              textAnchor="middle"
              fontSize="13"
              fontWeight="500"
              fill="#475569"
            >
              {item.axisName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
