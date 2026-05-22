import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
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
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { workflowStatusEntry } from "@/lib/domain/status-registry";

export type ParsedActionPlanAuditEvent = {
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

export function parseActionPlanAuditEntry(entry: ActionPlanAuditEntry): ParsedActionPlanAuditEvent {
  const old = entry.oldValue;
  const next = entry.newValue;
  const eventType = entry.eventType?.toLowerCase() ?? "";

  if (eventType === "insert" || eventType === "created" || eventType === "create" || !old) {
    return {
      id: entry.id,
      label: "Ação criada",
      description: pickField(next, "action_text") ? (
        pickField(next, "action_text")
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
        label: "Ação cancelada",
        date: entry.createdAt,
        icon: PauseCircle,
        tone: "warning",
      };
    }
    return {
      id: entry.id,
      label: `Status → ${workflowStatusEntry("action_plan", newStatus as PlanStatus).label}`,
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
      description: `Novo prazo: ${newDue.slice(0, 10)}`,
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
      description: newResp,
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

export function formatActivityRelative(iso: string): string {
  const date = new Date(iso);
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}
