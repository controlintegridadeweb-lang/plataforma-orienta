"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Spinner } from "@/components/ui/loading";
import { GENERATION_STEPS } from "@/lib/reports/respondent-presentation";

type Props = {
  active: boolean;
  /** Quando true, assume conclusao (passo final aceso). */
  finished?: boolean;
};

export function RespondentReportsGenerationProgress({ active, finished }: Props) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!active || finished) {
      setStepIndex(0);
      return;
    }
    setStepIndex(0);
    const timers: ReturnType<typeof setTimeout>[] = [];
    const pace = 550;
    for (let i = 0; i < GENERATION_STEPS.length - 1; i++) {
      timers.push(
        setTimeout(() => setStepIndex(i + 1), pace * (i + 1)),
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [active, finished]);

  const effectiveIndex = finished ? GENERATION_STEPS.length - 1 : active ? stepIndex : -1;

  if (!active && !finished) return null;

  return (
    <div
      className="overflow-hidden rounded-xl border border-sky-200 bg-sky-50/50 px-4 py-3"
      role="status"
      aria-live="polite"
    >
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-sky-800">
        {finished ? "Geração concluída" : "Processando relatório"}
      </p>
      <ol className="space-y-2">
        {GENERATION_STEPS.map((s, i) => {
          const done = finished ? true : i < effectiveIndex;
          const current = !finished && i === effectiveIndex;
          const pending = !finished && !done && !current;
          return (
            <li key={s.id} className="flex items-center gap-2 text-xs text-slate-700">
              {done ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              ) : current ? (
                <Spinner size="md" className="shrink-0 text-sky-600" />
              ) : pending ? (
                <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-slate-300" />
              ) : null}
              <span className={done || current ? "font-medium text-slate-900" : "text-slate-500"}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
