"use client";

import { useState } from "react";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import { listActionPlanAudit } from "@/lib/action-plans/client";

type Props = {
  planId: string;
};

function summarizePatch(value: unknown): string {
  if (value == null) return "-";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

export function PlanAuditHistory({ planId }: Props) {
  const [entries, setEntries] = useState<ActionPlanAuditEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(open: boolean) {
    if (!open || entries !== null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await listActionPlanAudit(planId);
      setEntries(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar auditoria do plano.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <details
      className="group rounded border border-slate-200 bg-slate-50/60"
      onToggle={(e) => handleToggle((e.currentTarget as HTMLDetailsElement).open)}
    >
      <summary className="cursor-pointer list-none px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 group-open:border-b group-open:border-slate-200">
        Auditoria do plano (técnica)
        {entries ? ` (${entries.length})` : ""}
      </summary>
      <div className="px-3 py-2 text-xs">
        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : error ? (
          <p className="text-rose-600">{error}</p>
        ) : !entries || entries.length === 0 ? (
          <p className="text-slate-500">Sem eventos de auditoria para este plano.</p>
        ) : (
          <ul className="divide-y divide-slate-200">
            {entries.map((entry) => (
              <li key={entry.id} className="space-y-1 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                    {entry.eventType}
                  </span>
                  <span className="text-slate-500">
                    {new Date(entry.createdAt).toLocaleString("pt-BR")}
                  </span>
                  {entry.actorId ? (
                    <span className="text-slate-500">
                      ator {entry.actorId.slice(0, 8)}...
                    </span>
                  ) : null}
                </div>
                <div className="grid gap-1 text-[11px] text-slate-600 md:grid-cols-2">
                  <div>
                    <span className="font-medium text-slate-500">Antes: </span>
                    <span className="break-all">{summarizePatch(entry.oldValue)}</span>
                  </div>
                  <div>
                    <span className="font-medium text-slate-500">Depois: </span>
                    <span className="break-all">{summarizePatch(entry.newValue)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </details>
  );
}
