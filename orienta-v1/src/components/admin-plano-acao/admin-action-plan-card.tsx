"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, CalendarClock, Eye, FileText } from "lucide-react";
import type { AdminPlanItem } from "@/lib/action-plans/admin-monitoring";
import { typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import {
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
  staffAreaFromPathname,
} from "@/lib/navigation/staff-paths";
import { AdminActionPlanProgress } from "./admin-action-plan-progress";
import { AdminActionPlanStatusBadge } from "./admin-action-plan-status-badge";

type Props = {
  item: AdminPlanItem;
  compact?: boolean;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function firstLine(text: string | null | undefined): string {
  const line = (text ?? "").trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

export function AdminActionPlanCard({ item, compact = false }: Props) {
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);
  const recHref = staffRecomendacoesHref(area, item.recommendationId);
  const visaoGeralHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
  const supervisaoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "monitoramento");

  const titleLine = item.actionText?.trim()
    ? firstLine(item.actionText)
    : firstLine(item.recommendationText);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] transition hover:border-slate-300 hover:shadow-[var(--shadow-card-hover)]">
      <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
        <div className="min-w-0 space-y-2">
          <AdminActionPlanStatusBadge view={item.view} presentation="chip" />
          <h2
            className={`font-semibold leading-snug text-slate-900 ${
              compact ? "line-clamp-2 text-sm" : "line-clamp-3 text-base"
            }`}
            title={titleLine}
          >
            {titleLine}
          </h2>
          <p className={`${typography.meta} line-clamp-1`}>
            {item.organizationName}
            {item.axisName ? ` · ${item.axisName}` : ""}
          </p>
          <p className={`inline-flex items-center gap-1 ${typography.meta} text-slate-500`}>
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
            Prazo {formatDate(item.dueDate)}
          </p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Progresso</span>
            <span className="tabular-nums font-semibold text-slate-700">{item.progress}%</span>
          </div>
          <AdminActionPlanProgress value={item.progress} overdue={item.isOverdue} size="xs" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3">
        <Link
          href={recHref}
          className={`${formSurface.secondaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Recomendação
        </Link>
        <Link
          href={visaoGeralHref}
          className={`${formSurface.primaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          Visão geral
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
        <Link
          href={supervisaoHref}
          className={`${formSurface.secondaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Supervisão
        </Link>
      </div>
    </article>
  );
}
