"use client";

import type { LucideIcon } from "lucide-react";

export type EntityHistoryEvent = {
  id: string;
  ts: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

type Props = {
  events: EntityHistoryEvent[];
};

/**
 * Lista vertical compartilhada por timelines admin (plano / recomendação).
 */
export function EntityHistoryTimeline({ events }: Props) {
  return (
    <ol className="relative space-y-3 border-l border-slate-200 pl-4">
      {events.map((e) => {
        const Icon = e.icon;
        return (
          <li key={e.id} className="relative">
            <span
              className={`absolute -left-[26px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${e.iconBg}`}
            >
              <Icon className={`h-3 w-3 ${e.iconColor}`} aria-hidden />
            </span>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                {formatDateTime(e.ts)}
              </p>
              <p className="text-xs font-semibold text-slate-800">{e.title}</p>
              {e.description ? (
                <p className="line-clamp-3 text-xs text-slate-600">{e.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
