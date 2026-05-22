"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useState } from "react";
import { ArrowRight, ChevronDown, Eye, FileText, MoreHorizontal } from "lucide-react";
import { AdminRecommendationProgress } from "@/components/admin-recomendacoes/admin-recommendation-progress";
import { AdminRecommendationRowDetail } from "@/components/admin-recomendacoes/admin-recommendation-row-detail";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import {
  deriveRecommendationPriority,
  firstLineRecommendation,
  formatRecommendationDate,
  planLinkSummary,
} from "@/components/admin-recomendacoes/admin-recommendation-row-utils";
import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import {
  staffAreaFromPathname,
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
} from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";

const COL_COUNT = 9;

type Props = {
  items: AdminRecommendationItem[];
  /** IDs expandidos controlados pelo pai (ex.: visão por organização). */
  expandedIds?: Set<string>;
  onExpandedChange?: (next: Set<string>) => void;
  /** Oculta coluna órgão quando todas as linhas são do mesmo órgão. */
  hideOrganizationColumn?: boolean;
};

export function AdminRecommendationTable({
  items,
  expandedIds: controlledExpanded,
  onExpandedChange,
  hideOrganizationColumn = false,
}: Props) {
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set());

  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded =
    onExpandedChange ??
    ((next: Set<string>) => {
      setInternalExpanded(next);
    });

  function toggleExpand(id: string) {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  }

  if (items.length === 0) return null;

  const colSpan = hideOrganizationColumn ? COL_COUNT - 1 : COL_COUNT;

  return (
    <div className={formSurface.table.wrapper}>
      <table className={`${formSurface.table.table} min-w-[1080px]`}>
        <thead className={formSurface.table.head}>
          <tr>
            <th className={`${formSurface.table.headCell} min-w-[14rem]`}>Recomendação</th>
            {hideOrganizationColumn ? null : (
              <th className={`${formSurface.table.headCell} min-w-[8rem]`}>Órgão</th>
            )}
            <th className={`${formSurface.table.headCell} min-w-[6rem]`}>Eixo</th>
            <th className={formSurface.table.headCell}>Status</th>
            <th className={formSurface.table.headCell}>Plano</th>
            <th className={`${formSurface.table.headCell} min-w-[7rem]`}>Progresso</th>
            <th className={formSurface.table.headCell}>Prioridade</th>
            <th className={`${formSurface.table.headCell} whitespace-nowrap`}>Atualização</th>
            <th className={`${formSurface.table.headCell} w-28 text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody className={formSurface.table.body}>
          {items.map((item, index) => {
            const isOpen = expanded.has(item.recommendationId);
            const priority = deriveRecommendationPriority(item);
            const plan = planLinkSummary(item);
            const title = firstLineRecommendation(item.recommendationText);
            const recHref = staffRecomendacoesHref(area, item.recommendationId);
            const planoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
            const supervisaoHref = staffPlanoAcaoDetailHref(
              area,
              item.recommendationId,
              "monitoramento",
            );
            const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50/40";

            return (
              <Fragment key={item.recommendationId}>
                <tr className={`${formSurface.table.row} ${zebra} ${isOpen ? "bg-brand-50/30" : ""}`}>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.recommendationId)}
                      aria-expanded={isOpen}
                      className="flex w-full min-w-0 items-start gap-2 text-left transition hover:text-brand-800"
                    >
                      <ChevronDown
                        className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-medium text-slate-900">{title}</span>
                        <span className="mt-0.5 block text-[11px] text-slate-500">
                          {item.formName} · v{item.formVersion}
                        </span>
                      </span>
                    </button>
                  </td>
                  {hideOrganizationColumn ? null : (
                    <td className={`${formSurface.table.cell} align-top text-sm text-slate-700`}>
                      <span className="line-clamp-2" title={item.organizationName}>
                        {item.organizationName}
                      </span>
                    </td>
                  )}
                  <td className={`${formSurface.table.cellMuted} align-top`}>
                    <span className="line-clamp-2" title={item.axisName}>
                      {item.axisName || "—"}
                    </span>
                  </td>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <AdminRecommendationStatusBadge view={item.view} size="sm" />
                  </td>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-medium ${
                        plan.tone === "muted"
                          ? formSurface.badge.neutral
                          : plan.tone === "brand"
                            ? formSurface.badge.brand
                            : formSurface.badge.neutral
                      }`}
                    >
                      {plan.label}
                    </span>
                    {plan.detail ? (
                      <p className="mt-1 text-[11px] text-slate-600">{plan.detail}</p>
                    ) : null}
                  </td>
                  <td className={`${formSurface.table.cell} align-top min-w-[7rem]`}>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs tabular-nums font-semibold text-slate-800">
                        {item.progress}%
                      </span>
                      <AdminRecommendationProgress
                        value={item.progress}
                        overdue={item.isOverdue}
                        size="xs"
                      />
                    </div>
                  </td>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ${priority.className}`}
                    >
                      {priority.label}
                    </span>
                  </td>
                  <td
                    className={`${formSurface.table.cellMuted} align-top whitespace-nowrap tabular-nums`}
                  >
                    {formatRecommendationDate(item.updatedAt)}
                  </td>
                  <td className={`${formSurface.table.cell} align-top text-right`}>
                    <div className="inline-flex items-center justify-end gap-0.5">
                      <Link
                        href={recHref}
                        title="Ver recomendação"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <FileText className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Ver recomendação</span>
                      </Link>
                      <Link
                        href={planoHref}
                        title="Abrir plano"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Abrir plano</span>
                      </Link>
                      <Link
                        href={supervisaoHref}
                        title="Monitoramento"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand-700 transition hover:bg-brand-50"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Monitoramento</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.recommendationId)}
                        title={isOpen ? "Recolher detalhes" : "Expandir detalhes"}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                      >
                        <MoreHorizontal className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Detalhes</span>
                      </button>
                    </div>
                  </td>
                </tr>
                {isOpen ? (
                  <tr className={zebra}>
                    <td colSpan={colSpan} className="p-0">
                      <AdminRecommendationRowDetail item={item} />
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
