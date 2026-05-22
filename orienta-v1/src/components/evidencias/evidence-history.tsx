"use client";

import type { EvidenceValidationEntry } from "@/lib/evidences/admin-service";
import { StatusBadge } from "./status-badge";

export function EvidenceHistory({ history }: { history: EvidenceValidationEntry[] }) {
  if (history.length === 0) {
    return (
      <p className="text-xs text-slate-500">Nenhuma validacao registrada ainda.</p>
    );
  }
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50">
      <p className="border-b border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600">
        Historico ({history.length})
      </p>
      <ul className="max-h-56 divide-y divide-slate-200 overflow-y-auto overscroll-contain">
        {history.map((entry) => (
          <li key={entry.id} className="space-y-1 px-3 py-2.5 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={entry.status} />
              <span className="text-slate-500">
                {new Date(entry.validatedAt).toLocaleString("pt-BR")}
              </span>
              <span className="font-mono text-slate-500">
                {entry.validatedBy.slice(0, 8)}…
              </span>
            </div>
            {entry.justification ? (
              <p className="whitespace-pre-wrap rounded border border-slate-100 bg-white/80 px-2 py-1.5 text-slate-700">
                {entry.justification}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
