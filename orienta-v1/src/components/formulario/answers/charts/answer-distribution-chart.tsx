import { MessageSquare } from "lucide-react";
import type {
  AnswerTextEntry,
  AnswerValueDistribution,
  QuestionAnswerType,
} from "@/lib/forms/answers-types";

const ANSWER_LABELS = {
  yes: "Sim",
  no: "Nao",
  partial: "Parcial",
} as const;

const ANSWER_COLORS = {
  yes: "#10b981",
  no: "#f43f5e",
  partial: "#f59e0b",
} as const;

type AnswerKey = keyof typeof ANSWER_LABELS;
const ANSWER_KEYS: readonly AnswerKey[] = ["yes", "no", "partial"];

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleInRadians: number,
) {
  return {
    x: cx + radius * Math.cos(angleInRadians),
    y: cy + radius * Math.sin(angleInRadians),
  };
}

function describeDonutArc(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
) {
  const startOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, startAngle);
  const endInner = polarToCartesian(cx, cy, innerR, endAngle);
  const largeArcFlag = endAngle - startAngle <= Math.PI ? 0 : 1;
  return [
    `M ${startOuter.x} ${startOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}`,
    `L ${startInner.x} ${startInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArcFlag} 1 ${endInner.x} ${endInner.y}`,
    "Z",
  ].join(" ");
}

function PieChart({
  distribution,
  total,
}: {
  distribution: AnswerValueDistribution;
  total: number;
}) {
  const size = 180;
  const outerR = size / 2;
  const innerR = outerR * 0.62;
  const cx = outerR;
  const cy = outerR;

  const entries = ANSWER_KEYS.map((key) => ({ key, value: distribution[key] })).filter(
    (e) => e.value > 0,
  );
  const single = entries.length === 1;
  let angle = -Math.PI / 2;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-40 w-40 shrink-0"
      role="img"
      aria-label="Distribuicao de respostas"
    >
      {single ? (
        <>
          <circle cx={cx} cy={cy} r={outerR} fill={ANSWER_COLORS[entries[0].key]} />
          <circle cx={cx} cy={cy} r={innerR} fill="white" />
        </>
      ) : (
        entries.map((entry) => {
          const slice = (entry.value / total) * Math.PI * 2;
          const start = angle;
          const end = angle + slice;
          const color = ANSWER_COLORS[entry.key];
          const path = describeDonutArc(cx, cy, outerR, innerR, start, end);
          angle = end;
          return <path key={entry.key} d={path} fill={color} />;
        })
      )}
      <text
        x={cx}
        y={cy - 4}
        textAnchor="middle"
        className="fill-slate-900"
        style={{ fontSize: 24, fontWeight: 600 }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 16}
        textAnchor="middle"
        className="fill-slate-500"
        style={{ fontSize: 11 }}
      >
        respostas
      </text>
    </svg>
  );
}

function HorizontalBars({
  distribution,
  total,
}: {
  distribution: AnswerValueDistribution;
  total: number;
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      {ANSWER_KEYS.map((key) => {
        const value = distribution[key];
        const pct = total === 0 ? 0 : (value / total) * 100;
        return (
          <div key={key} className="flex items-center gap-3 text-sm">
            <span className="w-16 shrink-0 font-medium text-slate-700">
              {ANSWER_LABELS[key]}
            </span>
            <div className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${pct.toFixed(2)}%`,
                  backgroundColor: ANSWER_COLORS[key],
                }}
                aria-hidden
              />
            </div>
            <span className="w-20 shrink-0 text-right tabular-nums text-slate-600">
              {value}
              <span className="ml-1 text-xs text-slate-400">
                ({pct.toFixed(0)}%)
              </span>
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({
  distribution,
  total,
}: {
  distribution: AnswerValueDistribution;
  total: number;
}) {
  return (
    <ul className="space-y-1.5 text-sm">
      {ANSWER_KEYS.map((key) => {
        const value = distribution[key];
        const pct = total === 0 ? 0 : (value / total) * 100;
        return (
          <li key={key} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: ANSWER_COLORS[key] }}
                aria-hidden
              />
              <span className="font-medium text-slate-700">
                {ANSWER_LABELS[key]}
              </span>
            </span>
            <span className="tabular-nums text-slate-600">
              <span className="font-semibold text-slate-900">{value}</span>
              <span className="ml-1 text-xs text-slate-400">
                ({pct.toFixed(0)}%)
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function TextList({ entries }: { entries: AnswerTextEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
        <MessageSquare className="h-6 w-6 text-slate-300" aria-hidden />
        <p className="text-sm font-medium text-slate-700">Sem respostas textuais</p>
        <p className="text-xs text-slate-500">
          As respostas discursivas aparecem aqui quando forem enviadas.
        </p>
      </div>
    );
  }
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
      {entries.map((entry) => (
        <li key={entry.responseId} className="px-4 py-3">
          <p className="whitespace-pre-wrap text-sm text-slate-800">{entry.notes}</p>
          <p className="mt-1.5 text-xs text-slate-500">
            {entry.organizationName}
            {entry.updatedAt
              ? ` - ${new Date(entry.updatedAt).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}

/**
 * Renderiza a distribuicao agregada de uma pergunta conforme `answerType`:
 *  - `yes_no`     -> donut + legenda
 *  - `scale`/`numeric` -> barras horizontais (escala objetiva)
 *  - `text`       -> lista das respostas mais recentes
 *
 * Quando ainda nao ha respostas, exibe estado vazio elegante.
 */
export function AnswerDistributionChart({
  answerType,
  distribution,
  total,
  textEntries,
}: {
  answerType: QuestionAnswerType;
  distribution: AnswerValueDistribution;
  total: number;
  textEntries: AnswerTextEntry[];
}) {
  if (answerType === "text") {
    return <TextList entries={textEntries} />;
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-700">Sem respostas</p>
        <p className="text-xs text-slate-500">
          A distribuicao aparece quando houver respostas registradas.
        </p>
      </div>
    );
  }

  if (answerType === "yes_no") {
    return (
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <PieChart distribution={distribution} total={total} />
        <div className="flex-1">
          <Legend distribution={distribution} total={total} />
        </div>
      </div>
    );
  }

  return <HorizontalBars distribution={distribution} total={total} />;
}
