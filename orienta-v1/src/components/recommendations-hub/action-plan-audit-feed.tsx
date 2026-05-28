"use client";

import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import {
  formatActivityRelative,
  parseActionPlanAuditEntry,
} from "@/lib/action-plans/audit-presentation";
import { typography } from "@/lib/layout/design-system";

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
  /** `conversation` — feed institucional com mais respiro (monitoramento). */
  variant?: "default" | "conversation";
};

export function ActionPlanAuditFeed({
  items,
  emptyMessage = "Nenhuma atividade registrada ainda.",
  limit = 50,
  variant = "default",
}: Props) {
  if (items.length === 0) {
    return (
      <p className={`rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center ${typography.auxiliary}`}>
        {emptyMessage}
      </p>
    );
  }

  const slice = items.slice(0, limit);
  const conversation = variant === "conversation";

  return (
    <ul className={conversation ? "space-y-4 py-3" : "divide-y divide-slate-100/90"}>
      {slice.map(({ id, entry, actionLabel }) => {
        const ev = parseActionPlanAuditEntry(entry);
        const Icon = ev.icon;
        const isInstitutional = /admin|supervision|staff|validat/i.test(
          entry.eventType ?? "",
        );

        if (conversation) {
          return (
            <li
              key={id}
              className={`rounded-lg border px-4 py-3.5 ${
                isInstitutional
                  ? "border-violet-100 bg-violet-50/40"
                  : "border-slate-100 bg-slate-50/50"
              }`}
            >
              <div className="flex gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_ICON[ev.tone]}`}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{ev.label}</p>
                    <time
                      className="text-micro tabular-nums text-slate-400"
                      dateTime={ev.date}
                    >
                      {formatActivityRelative(ev.date)}
                    </time>
                  </div>
                  {isInstitutional ? (
                    <p className="mt-0.5 text-2xs font-medium uppercase tracking-wide text-violet-700">
                      Equipe de supervisão
                    </p>
                  ) : (
                    <p className="mt-0.5 text-2xs font-medium uppercase tracking-wide text-slate-500">
                      Organização
                    </p>
                  )}
                  {actionLabel ? (
                    <p className={`mt-1.5 text-xs text-slate-600`}>{actionLabel}</p>
                  ) : null}
                  {ev.description ? (
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">{ev.description}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        }

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
                  className="shrink-0 text-micro tabular-nums text-slate-400"
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
