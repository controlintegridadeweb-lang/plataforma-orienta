"use client";

import { useState } from "react";
import type { RecommendationChangeEntry } from "@/lib/recommendations/admin-service";
import { listRecommendationHistory } from "@/lib/recommendations/client";
import { RECOMMENDATION_STATUS_LABELS } from "@/lib/domain/status-registry";

type Props = {
  recommendationId: string;
  initial?: RecommendationChangeEntry[];
};

const FIELD_LABELS: Record<RecommendationChangeEntry["field"], string> = {
  status: "Status",
  current_text: "Texto",
};

function formatValue(field: RecommendationChangeEntry["field"], value: string | null) {
  if (value === null || value === undefined) return "-";
  if (field === "status")
    return RECOMMENDATION_STATUS_LABELS[value as keyof typeof RECOMMENDATION_STATUS_LABELS] ?? value;
  return value;
}

export function RecommendationHistory({ recommendationId, initial }: Props) {
  const [entries, setEntries] = useState<RecommendationChangeEntry[] | null>(
    initial ?? null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(open: boolean) {
    if (!open || entries !== null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listRecommendationHistory(recommendationId);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar historico.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100/80"
      onToggle={(e) => handleToggle((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none px-4 py-3 text-xs font-semibold text-slate-700 marker:content-none hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
        <span className="underline decoration-slate-300 underline-offset-2 group-open:text-brand-800">
          Histórico
        </span>
        {entries ? ` (${entries.length})` : ""}
      </summary>
      <div className="px-3 py-2 text-xs">
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-slate-500">Sem mudancas registradas.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                    {FIELD_LABELS[entry.field]}
                  </span>
                  <span className="text-slate-500">
                    {new Date(entry.changedAt).toLocaleString("pt-BR")}
                  </span>
                  <span className="text-slate-500">
                    por {entry.changedByName ?? entry.changedBy.slice(0, 8)}
                  </span>
                </div>
                <div className="text-slate-700">
                  {entry.field === "current_text" ? (
                    <div className="space-y-1">
                      <div>
                        <span className="text-slate-500">de:</span>{" "}
                        <span className="whitespace-pre-wrap">
                          {formatValue(entry.field, entry.oldValue)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500">para:</span>{" "}
                        <span className="whitespace-pre-wrap">
                          {formatValue(entry.field, entry.newValue)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <span>
                      {formatValue(entry.field, entry.oldValue)} &rarr;{" "}
                      <strong>{formatValue(entry.field, entry.newValue)}</strong>
                    </span>
                  )}
                </div>
                {entry.comment ? (
                  <p className="italic text-slate-600">&ldquo;{entry.comment}&rdquo;</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
