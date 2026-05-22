import {
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  Pencil,
  PlayCircle,
  Send,
  Sparkles,
  User,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { listActionPlanAudit } from "@/lib/action-plans/client";
import { listRecommendationHistory } from "@/lib/recommendations/client";
import type { ActionPlanAuditEntry } from "@/lib/action-plans/admin-service";
import type { RecommendationChangeEntry } from "@/lib/recommendations/admin-service";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { workflowStatusEntry } from "@/lib/domain/status-registry";

export type AdminRecPlanTimelineEvent = {
  id: string;
  ts: string;
  title: string;
  description?: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
};

const FIELD_LABEL: Record<RecommendationChangeEntry["field"], string> = {
  status: "Status",
  current_text: "Texto",
};

function labelRecStatus(value: string | null): string {
  if (!value) return "—";
  return workflowStatusEntry("recommendation", value as RecommendationStatus).label;
}

function fromRecommendationChange(entry: RecommendationChangeEntry): AdminRecPlanTimelineEvent {
  const label = FIELD_LABEL[entry.field];
  let description = "";
  if (entry.field === "status") {
    description = `${labelRecStatus(entry.oldValue)} → ${labelRecStatus(entry.newValue)}`;
  } else if (entry.field === "current_text") {
    description = "Texto da recomendação ajustado pelo analista";
  }
  if (entry.comment) description += description ? ` · ${entry.comment}` : entry.comment;
  return {
    id: `rec-${entry.id}`,
    ts: entry.changedAt,
    title: `Atualização na recomendação · ${label}`,
    description,
    icon: Pencil,
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  };
}

function planStatusLabel(raw: string): string {
  return workflowStatusEntry("action_plan", raw as PlanStatus).label;
}

function fromPlanAudit(entry: ActionPlanAuditEntry): AdminRecPlanTimelineEvent {
  let icon: LucideIcon = Pencil;
  let iconBg = "bg-slate-100";
  let iconColor = "text-slate-600";
  let title = entry.eventType;
  let description: string | undefined;

  const old = entry.oldValue as Record<string, unknown> | null;
  const next = entry.newValue as Record<string, unknown> | null;

  switch (entry.eventType) {
    case "create": {
      title = "Plano de ação criado";
      description =
        next && typeof next.action_text === "string"
          ? (next.action_text as string)
          : "Plano cadastrado pela organização";
      icon = ClipboardList;
      iconBg = "bg-indigo-50";
      iconColor = "text-indigo-700";
      break;
    }
    case "status_change": {
      const oldStatus = old && typeof old.status === "string" ? (old.status as string) : "";
      const newStatus = next && typeof next.status === "string" ? (next.status as string) : "";
      title = "Status do plano atualizado";
      description = `${planStatusLabel(oldStatus || "to_implement")} → ${planStatusLabel(newStatus || "to_implement")}`;
      if (newStatus === "in_progress") {
        icon = PlayCircle;
        iconBg = "bg-sky-50";
        iconColor = "text-sky-700";
      } else if (newStatus === "completed") {
        icon = CheckCircle2;
        iconBg = "bg-emerald-50";
        iconColor = "text-emerald-700";
      } else if (newStatus === "to_implement") {
        icon = Send;
        iconBg = "bg-indigo-50";
        iconColor = "text-indigo-700";
      }
      break;
    }
    case "deadline_change": {
      const newDate = next && typeof next.due_date === "string" ? (next.due_date as string) : "";
      title = "Prazo do plano atualizado";
      description = newDate
        ? `Novo prazo: ${new Date(newDate).toLocaleDateString("pt-BR")}`
        : undefined;
      icon = CalendarClock;
      iconBg = "bg-amber-50";
      iconColor = "text-amber-700";
      break;
    }
    case "responsible_change": {
      title = "Responsável do plano atualizado";
      const responsible =
        next && typeof next.responsible_name === "string"
          ? (next.responsible_name as string)
          : "";
      description = responsible || undefined;
      icon = User;
      iconBg = "bg-violet-50";
      iconColor = "text-violet-700";
      break;
    }
    case "update": {
      title = "Plano de ação atualizado";
      icon = Pencil;
      break;
    }
    default: {
      title = entry.eventType;
    }
  }

  return {
    id: `plan-${entry.id}`,
    ts: entry.createdAt,
    title,
    description,
    icon,
    iconBg,
    iconColor,
  };
}

export type FetchAdminRecPlanTimelineOptions = {
  recommendationId: string;
  planId: string | null;
  /** Evento sintético “gerado” opcional (timestamp + descrição exibida na UI). */
  generation?: { ts: string; description: string } | null;
};

export async function fetchAdminRecPlanTimelineEvents(
  options: FetchAdminRecPlanTimelineOptions,
): Promise<AdminRecPlanTimelineEvent[]> {
  const { recommendationId, planId, generation } = options;
  const [recEntries, planEntries] = await Promise.all([
    listRecommendationHistory(recommendationId).catch(() => [] as RecommendationChangeEntry[]),
    planId
      ? listActionPlanAudit(planId).catch(() => [] as ActionPlanAuditEntry[])
      : Promise.resolve([] as ActionPlanAuditEntry[]),
  ]);
  const merged: AdminRecPlanTimelineEvent[] = [
    ...(generation
      ? [
          {
            id: "rec-generated",
            ts: generation.ts,
            title: "Recomendação gerada",
            description: generation.description,
            icon: Sparkles,
            iconBg: "bg-violet-50",
            iconColor: "text-violet-700",
          } satisfies AdminRecPlanTimelineEvent,
        ]
      : []),
    ...recEntries.map(fromRecommendationChange),
    ...planEntries.map(fromPlanAudit),
  ];
  merged.sort((a, b) => +new Date(b.ts) - +new Date(a.ts));
  return merged;
}
