"use client";

import Link from "next/link";
import { ArrowRight, Eye, FileText, Paperclip } from "lucide-react";
import { AdminRecommendationTimeline } from "@/components/admin-recomendacoes/admin-recommendation-timeline";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import type { AdminPlanItem } from "@/lib/action-plans/admin-monitoring";
import {
  firstLineAction,
  formatPlanDate,
  multiActionHint,
} from "@/components/admin-plano-acao/admin-action-plan-row-utils";
import {
  staffAreaFromPathname,
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
} from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

type Props = {
  item: AdminPlanItem;
};

export function AdminActionPlanRowDetail({ item }: Props) {
  const area = staffAreaFromPathname();
  const recHref = staffRecomendacoesHref(area, item.recommendationId);
  const planoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
  const monitoramentoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "monitoramento");
  const evidenciasHref = `/${area}/evidencias?organizationId=${encodeURIComponent(item.organizationId)}&formId=${encodeURIComponent(item.formId)}`;
  const multiHint = multiActionHint(item);

  return (
    <div className="grid gap-5 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
      <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
        <p className="text-micro font-semibold uppercase tracking-wider text-slate-500">
          Resumo da ação
        </p>
        <p className="text-sm font-medium text-slate-900">{firstLineAction(item)}</p>
        {item.actionText?.trim() ? (
          <p className={`${typography.auxiliary} line-clamp-4 whitespace-pre-wrap`}>
            {item.actionText.trim()}
          </p>
        ) : null}
        {multiHint ? <p className={typography.meta}>{multiHint}</p> : null}
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Recomendação</dt>
            <dd className="line-clamp-2 font-medium text-slate-800">{item.recommendationText.trim()}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Formulário</dt>
            <dd className="font-medium text-slate-800">
              {item.formName} <span className="text-slate-500">v{item.formVersion}</span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Responsável</dt>
            <dd className="font-medium text-slate-800">
              {item.responsibleName || "—"}
              {item.responsibleSector ? (
                <span className="font-normal text-slate-500"> · {item.responsibleSector}</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Prazo</dt>
            <dd className="font-medium text-slate-800">{formatPlanDate(item.dueDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-slate-500">
          Últimas movimentações
        </p>
        <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
          <AdminRecommendationTimeline
            recommendationId={item.recommendationId}
            planId={item.planId}
          />
        </div>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="space-y-2">
          <p className="text-micro font-semibold uppercase tracking-wider text-slate-500">
            Evidências vinculadas
          </p>
          <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5">
            <p className="text-sm text-slate-700">
              Tipo FAMI:{" "}
              <span className="font-medium text-slate-900">
                {recommendationTypeLabel(item.recommendationType)}
              </span>
            </p>
            <p className={`mt-2 ${typography.meta}`}>
              Evidências filtradas pela pergunta vinculada à recomendação (quando disponível no
              monitoramento completo).
            </p>
            <Link
              href={evidenciasHref}
              className={`${formSurface.ghostButton} mt-2 inline-flex h-8 gap-1.5 px-2 text-xs`}
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Abrir fila do escopo
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
          <Link href={recHref} className={`${formSurface.secondaryButtonSm} gap-1.5`}>
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Ver recomendação
          </Link>
          <Link href={planoHref} className={`${formSurface.secondaryButtonSm} gap-1.5`}>
            Visão geral
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link href={monitoramentoHref} className={`${formSurface.primaryButtonSm} gap-1.5`}>
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Monitoramento
          </Link>
        </div>
      </div>
    </div>
  );
}
