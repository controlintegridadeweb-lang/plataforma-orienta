"use client";

import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import {
  formatActivityRelative,
  parseActionPlanAuditEntry,
} from "@/lib/action-plans/audit-presentation";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

const TONE_ICON: Record<
  ReturnType<typeof parseActionPlanAuditEntry>["tone"],
  string
> = {
  neutral: "bg-slate-100 text-slate-600",
  info: "bg-sky-50 text-sky-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  muted: "bg-slate-50 text-slate-500",
};

export type AuditFeedItem = {
  id: string;
  entry: ActionPlanAuditEntry;
  actionLabel?: string;
};

type Props = {
  items: AuditFeedItem[];
  emptyMessage?: string;
  limit?: number;
};

export function ActionPlanAuditFeed({
  items,
  emptyMessage = "Nenhuma atividade registrada ainda.",
  limit = 50,
}: Props) {
  if (items.length === 0) {
    return (
      <p className={`rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center ${typography.auxiliary}`}>
        {emptyMessage}
      </p>
    );
  }

  const slice = items.slice(0, limit);

  return (
    <ul className="divide-y divide-slate-100/90">
      {slice.map(({ id, entry, actionLabel }) => {
        const ev = parseActionPlanAuditEntry(entry);
        const Icon = ev.icon;
        return (
          <li key={id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${TONE_ICON[ev.tone]}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
                <p className="text-sm font-medium text-slate-900">{ev.label}</p>
                <time
                  className="shrink-0 text-[11px] tabular-nums text-slate-400"
                  dateTime={ev.date}
                  title={new Date(ev.date).toLocaleString("pt-BR")}
                >
                  {formatActivityRelative(ev.date)}
                </time>
              </div>
              {actionLabel ? (
                <p className={`mt-0.5 line-clamp-1 ${typography.meta}`}>{actionLabel}</p>
              ) : null}
              {ev.description ? (
                <p className={`mt-1 ${typography.meta} text-slate-600`}>{ev.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
