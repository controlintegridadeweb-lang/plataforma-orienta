import { levelMeta } from "@/lib/fami/respondent-presentation";

const R = 52;
const STROKE = 7;
const CIRC = 2 * Math.PI * R;
const SIZE = 128;

type Props = {
  percentage: number;
  level: number;
  /** Omitir para exibir apenas o percentual central. */
  label?: string | null;
  /** Percentual central maior (ex.: score do diagnóstico). */
  emphasizePercent?: boolean;
};

export function FamiScoreRing({ percentage, level, label, emphasizePercent }: Props) {
  const safe = Math.max(0, Math.min(100, percentage));
  const dash = (safe / 100) * CIRC;
  const meta = levelMeta(level);
  const c = SIZE / 2;
  const showLabel = label != null && label.length > 0;

  return (
    <div
      className="relative shrink-0"
      style={{ width: SIZE, height: SIZE }}
      role="img"
      aria-label={
        showLabel
          ? `${label} ${safe.toFixed(1)} por cento`
          : `Pontuação FAMI ${safe.toFixed(1)} por cento`
      }
    >
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="block">
        <circle
          cx={c}
          cy={c}
          r={R}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={STROKE}
        />
        <circle
          cx={c}
          cy={c}
          r={R}
          fill="none"
          className={meta.ringColor}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${CIRC - dash}`}
          transform={`rotate(-90 ${c} ${c})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span
          className={`font-semibold tabular-nums tracking-normal ${meta.textColor} ${
            emphasizePercent ? "text-3xl sm:text-[2rem]" : "text-2xl font-medium"
          }`}
        >
          {safe.toFixed(1)}%
        </span>
        {showLabel ? (
          <span className="mt-0.5 max-w-[5.5rem] text-[10px] font-medium leading-tight text-slate-500">
            {label}
          </span>
        ) : null}
      </div>
    </div>
  );
}
