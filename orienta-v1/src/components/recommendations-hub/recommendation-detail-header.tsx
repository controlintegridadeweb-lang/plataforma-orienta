"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ClipboardCopy, Eye, FileText, LayoutGrid, MoreHorizontal } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";
import { notify } from "@/lib/notify";
import { staffPlanoAcaoDetailHref, staffPlanoAcaoHref, staffRecomendacoesHref } from "@/lib/navigation/staff-paths";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import { RecommendationTypeBadge } from "@/components/recomendacoes/recommendation-type-badge";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import { useRecommendationDetailContext } from "./recommendation-detail-context";

function supervisionTabLabel(pathname: string): string | null {
  if (pathname.endsWith("/monitoramento")) return "Monitoramento";
  if (pathname.endsWith("/acoes")) return "Ações";
  if (pathname.endsWith("/visao-geral")) return "Visão geral";
  return null;
}

function titleSummary(text: string, maxLen = 140): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}…`;
}


export function RecommendationDetailHeader() {
  const ctx = useRecommendationDetailContext();
  const pathname = usePathname() ?? "";
  const {
    role,
    listPath,
    row,
    respondentItem,
    staffItem,
    staffArea,
    workspaceSurface,
  } = ctx;

  const operational = workspaceSurface === "operational";
  const staffDocument = workspaceSurface === "document" && role === "staff";
  const staffSupervision = workspaceSurface === "supervision" && role === "staff";
  const staffOperational = operational && role === "staff";

  const item = role === "respondent" ? respondentItem : staffItem;
  if (!item) return null;

  const breadcrumbParts =
    role === "respondent"
      ? [
          respondentItem?.axisName,
          respondentItem?.sectionName,
          "Recomendação",
          ...(operational ? (["Plano de ação"] as const) : []),
        ].filter(Boolean)
      : staffDocument
        ? [staffItem?.axisName, staffItem?.sectionName, "Recomendação"].filter(Boolean)
        : staffSupervision
        ? [
            staffItem?.axisName,
            staffItem?.sectionName,
            "Plano de ação",
            supervisionTabLabel(pathname),
          ].filter(Boolean)
        : staffOperational
        ? [
            staffItem?.axisName,
            staffItem?.sectionName,
            "Plano de ação",
            "Monitoramento",
          ].filter(Boolean)
        : [staffItem?.axisName, staffItem?.sectionName, "Recomendação"].filter(Boolean);

  const planoHref =
    role === "respondent"
      ? `/respondente/plano-acao?formId=${encodeURIComponent(item.formId)}&recommendationId=${encodeURIComponent(item.recommendationId)}`
      : staffArea
        ? staffPlanoAcaoHref(staffArea, item.recommendationId)
        : "/admin/plano-acao";

  const supervisaoHref =
    staffArea && role === "staff"
      ? staffPlanoAcaoDetailHref(staffArea, item.recommendationId, "monitoramento")
      : null;

  const recHref =
    role === "staff" && staffArea
      ? staffRecomendacoesHref(staffArea, item.recommendationId)
      : null;

  async function copyText() {
    const text =
      role === "respondent"
        ? respondentItem?.recommendationText ?? ""
        : staffItem?.recommendationText ?? "";
    try {
      await navigator.clipboard.writeText(text);
      notify.success("Texto copiado.");
    } catch {
      notify.error("Não foi possível copiar.");
    }
  }

  const backLabel = staffDocument
    ? "Voltar às Recomendações"
    : staffSupervision || staffOperational
      ? "Voltar ao Plano de Ação"
      : operational && role === "respondent"
        ? "Voltar ao Portfólio"
        : role === "respondent"
          ? "Voltar ao portfólio"
          : "Voltar à lista";

  const secondaryCtaHref = staffSupervision || staffDocument ? recHref : staffOperational ? recHref ?? listPath : planoHref;
  const secondaryCtaLabel = staffDocument
    ? "Abrir plano de ação"
    : staffSupervision
      ? "Ver recomendação"
      : staffOperational
        ? "Fila de recomendações"
        : operational
          ? "Painel agregado"
          : "Painel do formulário";

  return (
    <header className={`${layout.sectionStack} space-y-5 border-b border-slate-100 pb-8`}>
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={listPath}
          className={`inline-flex items-center gap-1 ${typography.inlineNavLink} text-sm font-medium`}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {backLabel}
        </Link>
      </div>

      <nav className="text-[13px] text-slate-500" aria-label="Navegação hierárquica">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {breadcrumbParts.map((part, i) => (
            <li key={`${part}-${i}`} className="flex items-center gap-2">
              {i > 0 ? <span className="text-slate-300 select-none">/</span> : null}
              <span
                className={
                  i === breadcrumbParts.length - 1 ? "font-semibold text-slate-800" : "text-slate-600"
                }
              >
                {part}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1 space-y-4">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl whitespace-pre-wrap break-words leading-snug">
            {titleSummary(
              role === "respondent"
                ? respondentItem!.recommendationText
                : staffItem!.recommendationText,
              operational ? 280 : 220,
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {role === "respondent" ? (
              <>
                <RespondentRecommendationStatusBadge view={respondentItem!.view} />
                {respondentItem!.recommendationType ? (
                  <RecommendationTypeBadge type={respondentItem!.recommendationType} />
                ) : null}
              </>
            ) : (
              <>
                <AdminRecommendationStatusBadge view={staffItem!.view} />
                {staffItem!.recommendationType ? (
                  <RecommendationTypeBadge type={staffItem!.recommendationType} />
                ) : null}
              </>
            )}
          </div>
          <p className={`${typography.meta} text-[13px]`}>
            {role === "staff" && staffItem ? (
              <>
                <span className="font-medium text-slate-600">{staffItem.organizationName}</span>
                <span className="mx-1.5 text-slate-300">·</span>
              </>
            ) : null}
            <span>{item.formName}</span>
            {role === "staff" && staffItem ? (
              <span className="tabular-nums text-slate-400"> v{staffItem.formVersion}</span>
            ) : null}
          </p>

          {staffDocument && staffItem ? (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              Documento institucional · somente contexto
            </p>
          ) : null}

          {staffSupervision ? (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
              <Eye className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              Plano de ação · supervisão institucional
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {staffDocument && supervisaoHref ? (
            <Link
              href={supervisaoHref}
              className={`${formSurface.secondaryButtonSm} inline-flex items-center gap-1.5`}
            >
              <Eye className="h-3.5 w-3.5" aria-hidden />
              Supervisão
            </Link>
          ) : null}
          <Link
            href={staffDocument ? planoHref : secondaryCtaHref ?? listPath}
            className={`${staffDocument ? formSurface.primaryButtonSm : formSurface.secondaryButtonSm} inline-flex items-center gap-1.5`}
          >
            {staffDocument ? (
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            ) : staffSupervision || staffOperational ? (
              <FileText className="h-3.5 w-3.5" aria-hidden />
            ) : (
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
            )}
            {secondaryCtaLabel}
          </Link>
          <details className="relative">
            <summary
              className={`${formSurface.ghostButton} inline-flex cursor-pointer list-none items-center gap-1 px-2 py-1.5 text-xs [&::-webkit-details-marker]:hidden`}
              aria-label="Mais opções"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => void copyText()}
              >
                <ClipboardCopy className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                Copiar recomendação
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
