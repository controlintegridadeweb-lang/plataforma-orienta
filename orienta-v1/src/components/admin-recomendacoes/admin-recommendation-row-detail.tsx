"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowRight, Eye, FileText, Paperclip } from "lucide-react";
import { AdminRecommendationTimeline } from "@/components/admin-recomendacoes/admin-recommendation-timeline";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import type { AdminRecommendationItem } from "@/lib/recommendations/admin-presentation";
import {
  firstLineRecommendation,
  formatRecommendationDate,
} from "@/components/admin-recomendacoes/admin-recommendation-row-utils";
import {
  staffAreaFromPathname,
  staffPlanoAcaoDetailHref,
  staffRecomendacoesHref,
} from "@/lib/navigation/staff-paths";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

type Props = {
  item: AdminRecommendationItem;
};

export function AdminRecommendationRowDetail({ item }: Props) {
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);
  const recHref = staffRecomendacoesHref(area, item.recommendationId);
  const planoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "visao-geral");
  const supervisaoHref = staffPlanoAcaoDetailHref(area, item.recommendationId, "monitoramento");
  const evidenciasHref = `/${area}/evidencias?organizationId=${encodeURIComponent(item.organizationId)}&formId=${encodeURIComponent(item.formId)}`;

  return (
    <div className="grid gap-5 border-t border-slate-100 bg-slate-50/50 px-4 py-4 sm:grid-cols-2 sm:px-5 lg:grid-cols-3">
      <div className="min-w-0 space-y-2 sm:col-span-2 lg:col-span-1">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Resumo</p>
        <p className="text-sm font-medium text-slate-900">{firstLineRecommendation(item.recommendationText)}</p>
        <p className={`${typography.auxiliary} line-clamp-4 whitespace-pre-wrap`}>
          {item.recommendationText.trim()}
        </p>
        <dl className="grid gap-2 text-xs sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Formulário</dt>
            <dd className="font-medium text-slate-800">
              {item.formName} <span className="text-slate-500">v{item.formVersion}</span>
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Seção</dt>
            <dd className="font-medium text-slate-800">{item.sectionName || "—"}</dd>
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
            <dt className="text-slate-500">Prazo do plano</dt>
            <dd className="font-medium text-slate-800">{formatRecommendationDate(item.dueDate)}</dd>
          </div>
        </dl>
      </div>

      <div className="min-w-0 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
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
              Consulte evidências e complementações do mesmo formulário e órgão no módulo de
              validação.
            </p>
            <Link
              href={evidenciasHref}
              className={`${formSurface.ghostButton} mt-2 inline-flex h-8 gap-1.5 px-2 text-xs`}
            >
              <Paperclip className="h-3.5 w-3.5" aria-hidden />
              Abrir evidências do escopo
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-slate-200/80 pt-3">
          <Link href={recHref} className={`${formSurface.secondaryButtonSm} gap-1.5`}>
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Ver recomendação
          </Link>
          <Link href={planoHref} className={`${formSurface.secondaryButtonSm} gap-1.5`}>
            Abrir plano
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
          <Link href={supervisaoHref} className={`${formSurface.primaryButtonSm} gap-1.5`}>
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Monitoramento
          </Link>
        </div>
      </div>
    </div>
  );
}
