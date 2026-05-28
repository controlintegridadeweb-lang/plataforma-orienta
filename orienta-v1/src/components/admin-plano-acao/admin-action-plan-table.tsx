"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { ArrowRight, ChevronDown, Eye, FileText, MoreHorizontal } from "lucide-react";
import { AdminActionPlanProgress } from "@/components/admin-plano-acao/admin-action-plan-progress";
import { AdminActionPlanRowDetail } from "@/components/admin-plano-acao/admin-action-plan-row-detail";
import { AdminActionPlanStatusBadge } from "@/components/admin-plano-acao/admin-action-plan-status-badge";
import {
  firstLineAction,
  formatPlanDate,
  planStatusLabel,
  recommendationContextLine,
  riskBadge,
} from "@/components/admin-plano-acao/admin-action-plan-row-utils";
import type { AdminPlanItem } from "@/lib/action-plans/admin-monitoring";
import {
  staffAreaFromPathname,
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
} from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";

const COL_COUNT = 11;

type Props = {
  items: AdminPlanItem[];
  expandedIds?: Set<string>;
  onExpandedChange?: (next: Set<string>) => void;
  hideOrganizationColumn?: boolean;
};

export function AdminActionPlanTable({
  items,
  expandedIds: controlledExpanded,
  onExpandedChange,
  hideOrganizationColumn = false,
}: Props) {
  const area = staffAreaFromPathname();
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(new Set());

  const expanded = controlledExpanded ?? internalExpanded;
  const setExpanded =
    onExpandedChange ??
    ((next: Set<string>) => {
      setInternalExpanded(next);
    });

  function toggleExpand(rowKey: string) {
    const next = new Set(expanded);
    if (next.has(rowKey)) next.delete(rowKey);
    else next.add(rowKey);
    setExpanded(next);
  }

  if (items.length === 0) return null;

  const colSpan = hideOrganizationColumn ? COL_COUNT - 1 : COL_COUNT;

  return (
    <div className={formSurface.table.wrapper}>
      <table className={`${formSurface.table.table} min-w-285`}>
        <thead className={formSurface.table.head}>
          <tr>
            <th className={`${formSurface.table.headCell} min-w-48`}>Ação</th>
            {hideOrganizationColumn ? null : (
              <th className={`${formSurface.table.headCell} min-w-32`}>Órgão</th>
            )}
            <th className={`${formSurface.table.headCell} min-w-24`}>Eixo</th>
            <th className={formSurface.table.headCell}>Status</th>
            <th className={`${formSurface.table.headCell} min-w-32`}>Recomendação</th>
            <th className={formSurface.table.headCell}>Responsável</th>
            <th className={`${formSurface.table.headCell} min-w-28`}>Progresso</th>
            <th className={formSurface.table.headCell}>Prazo</th>
            <th className={formSurface.table.headCell}>Risco</th>
            <th className={`${formSurface.table.headCell} whitespace-nowrap`}>Atualização</th>
            <th className={`${formSurface.table.headCell} w-28 text-right`}>Ações</th>
          </tr>
        </thead>
        <tbody className={formSurface.table.body}>
          {items.map((item, index) => {
            const isOpen = expanded.has(item.rowKey);
            const title = firstLineAction(item);
            const risk = riskBadge(item.risk);
            const recHref = staffRecomendacoesHref(area, item.recommendationId);
            const planoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
            const monitoramentoHref = staffPlanoAcaoDetailHref(
              area,
              item.recommendationId,
              "monitoramento",
            );
            const zebra = index % 2 === 0 ? "bg-white" : "bg-slate-50/40";

            return (
              <Fragment key={item.rowKey}>
                <tr className={`${formSurface.table.row} ${zebra} ${isOpen ? "bg-brand-50/30" : ""}`}>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.rowKey)}
                      aria-expanded={isOpen}
                      className="flex w-full min-w-0 items-start gap-2 text-left transition hover:text-brand-800"
                    >
                      <ChevronDown
                        className={`mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`}
                        aria-hidden
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-medium text-slate-900">{title}</span>
                        {item.planStatus ? (
                          <span className="mt-0.5 block text-micro text-slate-500">
                            {planStatusLabel(item.planStatus)}
                          </span>
                        ) : null}
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
                      {item.axisName || ""}
                    </span>
                  </td>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <AdminActionPlanStatusBadge view={item.view} presentation="chip" />
                  </td>
                  <td className={`${formSurface.table.cellMuted} align-top`}>
                    <span className="line-clamp-2 text-xs" title={item.recommendationText}>
                      {recommendationContextLine(item)}
                    </span>
                  </td>
                  <td className={`${formSurface.table.cell} align-top text-sm text-slate-700`}>
                    <span className="line-clamp-1">{item.responsibleName || ""}</span>
                    {item.responsibleSector ? (
                      <span className="block text-micro text-slate-500">{item.responsibleSector}</span>
                    ) : null}
                  </td>
                  <td className={`${formSurface.table.cell} align-top min-w-28`}>
                    <div className="flex items-center gap-2">
                      <span className="shrink-0 text-xs tabular-nums font-semibold text-slate-800">
                        {item.progress}%
                      </span>
                      <AdminActionPlanProgress
                        value={item.progress}
                        overdue={item.isOverdue}
                        size="xs"
                      />
                    </div>
                  </td>
                  <td
                    className={`${formSurface.table.cell} align-top whitespace-nowrap text-sm ${
                      item.isOverdue ? "font-semibold text-rose-700" : "text-slate-700"
                    }`}
                  >
                    {formatPlanDate(item.dueDate)}
                  </td>
                  <td className={`${formSurface.table.cell} align-top`}>
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-micro font-semibold ${risk.className}`}
                    >
                      {risk.label}
                    </span>
                  </td>
                  <td
                    className={`${formSurface.table.cellMuted} align-top whitespace-nowrap text-xs tabular-nums`}
                  >
                    {formatPlanDate(item.updatedAt)}
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
                        title="Visão geral do plano"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                      >
                        <ArrowRight className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Plano</span>
                      </Link>
                      <Link
                        href={monitoramentoHref}
                        title="Monitoramento"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-brand-700 transition hover:bg-brand-50"
                      >
                        <Eye className="h-4 w-4" aria-hidden />
                        <span className="sr-only">Monitoramento</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleExpand(item.rowKey)}
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
                      <AdminActionPlanRowDetail item={item} />
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
