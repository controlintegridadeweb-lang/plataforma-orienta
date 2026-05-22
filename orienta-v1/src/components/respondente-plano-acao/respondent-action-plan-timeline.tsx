"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarClock,
  CheckCircle2,
  CircleDot,
  FileEdit,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Sparkles,
  UserCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listRespondentActionPlanAudit } from "@/lib/action-plans/client";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { workflowStatusEntry } from "@/lib/domain/status-registry";
import { formSurface } from "@/lib/form-surface";
import { Spinner } from "@/components/ui/loading";

type Props = {
  planId: string | null;
};

type ParsedEvent = {
  id: string;
  label: string;
  description?: ReactNode;
  date: string;
  icon: LucideIcon;
  tone: "neutral" | "info" | "success" | "warning" | "muted";
};

function pickField(value: unknown, field: string): string | null {
  if (!value || typeof value !== "object") return null;
  const v = (value as Record<string, unknown>)[field];
  return v == null ? null : typeof v === "string" ? v : String(v);
}

function parseEntry(entry: ActionPlanAuditEntry): ParsedEvent {
  const old = entry.oldValue;
  const next = entry.newValue;
  const eventType = entry.eventType?.toLowerCase() ?? "";

  if (eventType === "insert" || eventType === "created" || !old) {
    return {
      id: entry.id,
      label: "Ação criada",
      description: pickField(next, "action_text") ? (
        <span className="line-clamp-2">{pickField(next, "action_text")}</span>
      ) : undefined,
      date: entry.createdAt,
      icon: PlusCircle,
      tone: "success",
    };
  }

  if (eventType === "delete" || eventType === "deleted") {
    return {
      id: entry.id,
      label: "Ação removida",
      date: entry.createdAt,
      icon: PauseCircle,
      tone: "warning",
    };
  }

  // UPDATE: derivar baseado nas diferencas relevantes
  const newStatus = pickField(next, "status");
  const oldStatus = pickField(old, "status");
  if (newStatus && newStatus !== oldStatus) {
    if (newStatus === "completed") {
      return {
        id: entry.id,
        label: "Ação concluída",
        date: entry.createdAt,
        icon: CheckCircle2,
        tone: "success",
      };
    }
    if (newStatus === "in_progress") {
      return {
        id: entry.id,
        label: "Execução iniciada",
        date: entry.createdAt,
        icon: PlayCircle,
        tone: "info",
      };
    }
    if (newStatus === "cancelled") {
      return {
        id: entry.id,
        label: "Ação pausada",
        date: entry.createdAt,
        icon: PauseCircle,
        tone: "warning",
      };
    }
    return {
      id: entry.id,
      label: `Status alterado para ${workflowStatusEntry("action_plan", newStatus as PlanStatus).label}`,
      date: entry.createdAt,
      icon: Sparkles,
      tone: "info",
    };
  }

  const newDue = pickField(next, "due_date");
  const oldDue = pickField(old, "due_date");
  if (newDue && newDue !== oldDue) {
    return {
      id: entry.id,
      label: "Prazo atualizado",
      description: <span>Novo prazo: {newDue.slice(0, 10)}</span>,
      date: entry.createdAt,
      icon: CalendarClock,
      tone: "info",
    };
  }

  const newResp = pickField(next, "responsible_name");
  const oldResp = pickField(old, "responsible_name");
  if (newResp && newResp !== oldResp) {
    return {
      id: entry.id,
      label: "Responsável atualizado",
      description: <span>{newResp}</span>,
      date: entry.createdAt,
      icon: UserCircle2,
      tone: "info",
    };
  }

  const newText = pickField(next, "action_text");
  const oldText = pickField(old, "action_text");
  if (newText && newText !== oldText) {
    return {
      id: entry.id,
      label: "Descrição atualizada",
      date: entry.createdAt,
      icon: FileEdit,
      tone: "muted",
    };
  }

  return {
    id: entry.id,
    label: "Atualização registrada",
    date: entry.createdAt,
    icon: CircleDot,
    tone: "muted",
  };
}

const TONE_DOT: Record<ParsedEvent["tone"], string> = {
  neutral: "bg-slate-200 text-slate-700",
  info: "bg-sky-100 text-sky-700",
  success: "bg-emerald-100 text-emerald-700",
  warning: "bg-rose-100 text-rose-700",
  muted: "bg-slate-100 text-slate-500",
};

export function RespondentActionPlanTimeline({ planId }: Props) {
  const [entries, setEntries] = useState<ActionPlanAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!planId) {
      setEntries([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    listRespondentActionPlanAudit(planId)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Falha ao carregar histórico.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [planId]);

  if (!planId) {
    return (
      <p className={formSurface.messageNeutral}>
        Crie ou salve a ação primeiro para registrar o histórico de alterações.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="inline-flex items-center gap-2 text-xs text-slate-500">
        <Spinner size="sm" />
        Carregando histórico...
      </div>
    );
  }

  if (error) {
    return <p className={formSurface.messageError}>{error}</p>;
  }

  if (entries.length === 0) {
    return (
      <p className={formSurface.messageNeutral}>
        Ainda não há eventos salvos nesta linha de ação.
      </p>
    );
  }

  const events = entries.map(parseEntry);

  return (
    <ol className="relative space-y-3 border-l border-dashed border-slate-200 pl-5">
      {events.map((ev) => {
        const Icon = ev.icon;
        return (
          <li key={ev.id} className="relative">
            <span
              className={`absolute -left-[26px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${TONE_DOT[ev.tone]}`}
            >
              <Icon className="h-3 w-3" aria-hidden />
            </span>
            <div className="rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-slate-800">{ev.label}</span>
                <span className="text-[10px] text-slate-400">
                  {new Date(ev.date).toLocaleString("pt-BR")}
                </span>
              </div>
              {ev.description ? (
                <p className="mt-1 text-[11px] text-slate-600">{ev.description}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
