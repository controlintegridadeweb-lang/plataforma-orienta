import { Activity, FilePlus2, FileX2, FileEdit, ShieldCheck, History } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { RecentActivity } from "@/lib/dashboards/queries";

function formatRelative(timestamp: string): string {
  const date = new Date(timestamp);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "agora mesmo";
  if (minutes < 60) return `${minutes} min atras`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atras`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} d atras`;
  return date.toLocaleDateString("pt-BR");
}

const TABLE_LABELS: Record<string, string> = {
  responses: "resposta",
  evidences: "evidencia",
  evidence_validations: "validacao de evidencia",
  recommendations: "recomendacao",
  action_plans: "plano de acao",
  forms: "formulario",
  organizations: "organizacao",
  users: "usuario",
};

function tableLabel(tableName: string | null): string {
  if (!tableName) return "registro";
  return TABLE_LABELS[tableName] ?? tableName.replace(/_/g, " ");
}

function eventVisuals(eventType: string, tableName: string | null): {
  icon: LucideIcon;
  title: string;
} {
  const label = tableLabel(tableName);
  if (eventType === "INSERT") {
    if (tableName === "evidence_validations") {
      return { icon: ShieldCheck, title: `Nova ${label}` };
    }
    return { icon: FilePlus2, title: `Nova ${label}` };
  }
  if (eventType === "UPDATE") {
    return { icon: FileEdit, title: `${label.charAt(0).toUpperCase()}${label.slice(1)} atualizada` };
  }
  if (eventType === "DELETE") {
    return { icon: FileX2, title: `${label.charAt(0).toUpperCase()}${label.slice(1)} removida` };
  }
  return { icon: Activity, title: `${eventType} em ${label}` };
}

type GroupedActivity = {
  key: string;
  count: number;
  first: RecentActivity;
  last: RecentActivity;
};

function groupConsecutive(activities: RecentActivity[]): GroupedActivity[] {
  const groups: GroupedActivity[] = [];
  for (const a of activities) {
    const key = `${a.eventType}|${a.tableName ?? ""}|${a.actorEmail ?? ""}`;
    const tail = groups[groups.length - 1];
    if (tail && tail.key === key) {
      tail.count += 1;
      tail.last = a;
    } else {
      groups.push({ key, count: 1, first: a, last: a });
    }
  }
  return groups;
}

export function ActivityFeed({ activities }: { activities: RecentActivity[] }) {
  if (activities.length === 0) {
    return (
      <div className="flex items-start gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 p-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500">
          <History className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <p className="text-base font-semibold text-slate-800">Sem atividades recentes</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Os eventos do sistema aparecerao aqui em tempo real.
          </p>
        </div>
      </div>
    );
  }

  const groups = groupConsecutive(activities);

  return (
    <ol className="relative space-y-4 before:absolute before:left-4.25 before:top-1 before:bottom-1 before:w-px before:bg-slate-200">
      {groups.map((group) => {
        const { icon: Icon, title } = eventVisuals(group.first.eventType, group.first.tableName);
        const actor = group.first.actorEmail ?? "Sistema";
        const when = formatRelative(group.first.createdAt);
        return (
          <li key={group.first.id} className="relative flex items-start gap-4 pl-0">
            <div className="relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 ring-6 ring-white">
              <Icon className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0 flex-1 pt-1">
              <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-900">
                <span>{title}</span>
                {group.count > 1 ? (
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-slate-600">
                    {group.count}x
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">
                <span className="truncate">{actor}</span>
                <span className="px-2 text-slate-300">|</span>
                <span>{when}</span>
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
