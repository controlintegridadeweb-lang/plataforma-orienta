"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronLeft, ClipboardCopy, Eye, FileText, LayoutGrid, MoreHorizontal } from "lucide-react";
import { formSurface } from "@/lib/layout/form-surface";
import { layout, typography } from "@/lib/layout/design-system";
import { notify } from "@/lib/notify";
import { staffPlanoAcaoDetailHref, staffPlanoAcaoHref, staffRecomendacoesHref } from "@/lib/navigation/staff-paths";
import { RESPONDENT_RECOMMENDATIONS_MODULE_LABEL } from "@/lib/navigation/respondent-portfolio-paths";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import { RecommendationTypeBadge } from "@/components/recomendacoes/recommendation-type-badge";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import { StaffModuleTrail } from "@/components/staff/staff-module-trail";
import { useRecommendationDetailContext } from "./recommendation-detail-context";
import { workspaceTabMeta } from "./workspace-tab-meta";
import { firstLineRecommendation } from "@/components/respondente-recomendacoes/respondent-recommendation-row-utils";

function supervisionTabLabel(pathname: string): string | null {
  if (pathname.endsWith("/monitoramento")) return "Monitoramento";
  if (pathname.endsWith("/acoes")) return "A??es";
  if (pathname.endsWith("/visao-geral")) return "Vis?o geral";
  return null;
}

function titleSummary(text: string, maxLen = 140): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return `${t.slice(0, maxLen).trim()}?`;
}

export function RecommendationDetailHeader() {
  const ctx = useRecommendationDetailContext();
  const pathname = usePathname() ?? "";
  const {
    role,
    listPath,
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

  const tabMeta = workspaceTabMeta(pathname);
  const slimOperationalHeader = operational && role === "respondent";
  const displayTitle = slimOperationalHeader
    ? firstLineRecommendation(respondentItem!.recommendationText)
    : titleSummary(
        role === "respondent"
          ? respondentItem!.recommendationText
          : staffItem!.recommendationText,
        operational ? 120 : 220,
      );

  const breadcrumbParts =
    role === "respondent"
      ? [
          respondentItem?.axisName,
          respondentItem?.sectionName,
          RESPONDENT_RECOMMENDATIONS_MODULE_LABEL,
          ...(operational ? [tabMeta.label] : []),
        ].filter(Boolean)
      : staffDocument
        ? [staffItem?.axisName, staffItem?.sectionName, "Recomenda??o"].filter(Boolean)
        : staffSupervision
          ? [
              staffItem?.axisName,
              staffItem?.sectionName,
              "Plano de A??o",
              supervisionTabLabel(pathname),
            ].filter(Boolean)
          : staffOperational
            ? [
                staffItem?.axisName,
                staffItem?.sectionName,
                "Plano de A??o",
                "Monitoramento",
              ].filter(Boolean)
            : [staffItem?.axisName, staffItem?.sectionName, "Recomenda??o"].filter(Boolean);

  const planoHref =
    role === "respondent"
      ? `/respondente/portfolio-recomendacoes?formId=${encodeURIComponent(item.formId)}&recommendationId=${encodeURIComponent(item.recommendationId)}`
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
      notify.error("N?o foi poss?vel copiar.");
    }
  }

  const backLabel = staffDocument
    ? "Voltar ?s Recomenda??es"
    : staffSupervision || staffOperational
      ? "Voltar ao Plano de A??o"
      : role === "respondent"
        ? `Voltar a ${RESPONDENT_RECOMMENDATIONS_MODULE_LABEL}`
        : "Voltar ? lista";

  const secondaryCtaHref =
    staffSupervision || staffDocument ? recHref : staffOperational ? (recHref ?? listPath) : planoHref;
  const secondaryCtaLabel = staffDocument
    ? "Abrir plano de a??o"
    : staffSupervision
      ? "Ver recomenda??o"
      : staffOperational
        ? "Fila de recomenda??es"
        : operational
          ? "Ver lista"
          : "Painel do formul?rio";

  const staffTrailActive = staffDocument
    ? "recommendation"
    : staffSupervision
      ? pathname.endsWith("/monitoramento")
        ? "monitoring"
        : "plan"
      : null;

  const moduleTagline =
    role === "respondent"
      ? `${RESPONDENT_RECOMMENDATIONS_MODULE_LABEL} ? ${tabMeta.tagline}`
      : `Plano de a??o ? ${tabMeta.tagline}`;

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

      {role === "staff" && staffTrailActive ? (
        <StaffModuleTrail recommendationId={item.recommendationId} active={staffTrailActive} />
      ) : null}

      <nav className="text-caption text-slate-500" aria-label="Navega??o hier?rquica">
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
          <p className="text-2xs font-semibold uppercase tracking-wider text-brand-700">{moduleTagline}</p>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl break-words leading-snug">
            {displayTitle}
          </h1>
          {!slimOperationalHeader ? (
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
          ) : (
            <p className="text-sm text-slate-500">{tabMeta.description}</p>
          )}
          <p className={`${typography.meta} text-caption`}>
            {role === "staff" && staffItem ? (
              <>
                <span className="font-medium text-slate-600">{staffItem.organizationName}</span>
                <span className="mx-1.5 text-slate-300">?</span>
              </>
            ) : null}
            <span>{item.formName}</span>
            {role === "staff" && staffItem ? (
              <span className="tabular-nums text-slate-400"> v{staffItem.formVersion}</span>
            ) : null}
          </p>

          {staffDocument && staffItem ? (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-micro font-semibold text-slate-700">
              Documento institucional ? somente contexto
            </p>
          ) : null}

          {staffSupervision ? (
            <p className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2.5 py-1 text-micro font-semibold text-slate-700">
              <Eye className="h-3.5 w-3.5 text-slate-500" aria-hidden />
              Plano de a??o ? monitoramento institucional
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
              Monitoramento
            </Link>
          ) : null}
          <Link
            href={staffDocument ? planoHref : (secondaryCtaHref ?? listPath)}
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
              aria-label="Mais op??es"
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
            </summary>
            <div className="absolute right-0 z-20 mt-1 min-w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-700 hover:bg-slate-50"
                onClick={() => void copyText()}
              >
                <ClipboardCopy className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
                Copiar recomenda??o
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
