"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Eye, FileText } from "lucide-react";
import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import { AdminRecommendationProgress } from "@/components/admin-recomendacoes/admin-recommendation-progress";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import {
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
  staffAreaFromPathname,
} from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

function firstLine(text: string): string {
  const line = text.trim().split(/\r?\n/)[0]?.trim() ?? "";
  return line || "(sem título)";
}

function derivePriorityLabel(item: AdminRecommendationItem): { label: string; className: string } {
  if (item.view === "overdue" || item.isOverdue) {
    return { label: "Alta", className: formSurface.badge.danger };
  }
  if (item.view === "in_execution" && item.isDueSoon) {
    return { label: "Média", className: formSurface.badge.warning };
  }
  if (!item.hasPlan || item.view === "awaiting_plan" || item.view === "open") {
    return { label: "Atenção", className: formSurface.badge.warning };
  }
  if (item.view === "completed") {
    return { label: "Baixa", className: formSurface.badge.neutral };
  }
  return { label: "Normal", className: formSurface.badge.neutral };
}

type Props = {
  item: AdminRecommendationItem;
  compact?: boolean;
};

/** Card estratégico da fila de recomendações — acesso rápido a documento, plano e supervisão. */
export function AdminRecommendationStrategicCard({ item, compact = false }: Props) {
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);
  const recHref = staffRecomendacoesHref(area, item.recommendationId);
  const planoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
  const supervisaoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "monitoramento");
  const priority = derivePriorityLabel(item);
  const title = firstLine(item.recommendationText);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[var(--shadow-card)] transition hover:border-slate-300 hover:shadow-[var(--shadow-card-hover)]">
      <div className={`flex flex-1 flex-col gap-3 ${compact ? "p-4" : "p-5"}`}>
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <AdminRecommendationStatusBadge view={item.view} size="sm" />
            <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold ${priority.className}`}>
              Prioridade {priority.label}
            </span>
          </div>
          <h2
            className={`font-semibold leading-snug text-slate-900 ${compact ? "line-clamp-2 text-sm" : "line-clamp-3 text-base"}`}
            title={title}
          >
            {title}
          </h2>
          <p className={`${typography.meta} line-clamp-1`}>{item.axisName || "—"}</p>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Progresso</span>
            <span className="tabular-nums font-semibold text-slate-800">{item.progress}%</span>
          </div>
          <AdminRecommendationProgress value={item.progress} overdue={item.isOverdue} size="xs" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/40 px-4 py-3">
        <Link
          href={recHref}
          className={`${formSurface.secondaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Ver recomendação
        </Link>
        <Link
          href={planoHref}
          className={`${formSurface.secondaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          Plano
          <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
        </Link>
        <Link
          href={supervisaoHref}
          className={`${formSurface.primaryButtonSm} inline-flex flex-1 items-center justify-center gap-1 text-[11px] sm:flex-none`}
        >
          <Eye className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Supervisão
        </Link>
      </div>
    </article>
  );
}
