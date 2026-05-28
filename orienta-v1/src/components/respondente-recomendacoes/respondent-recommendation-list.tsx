"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { recommendationTypeEntry, recommendationTypeLabel } from "@/lib/domain/status-registry";
import { RespondentRecommendationProgress } from "@/components/respondente-recomendacoes/respondent-recommendation-progress";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import {
  firstLineRecommendation,
  formatRecommendationDate,
  planLinkSummary,
  recommendationContextMeta,
} from "@/components/respondente-recomendacoes/respondent-recommendation-row-utils";
import type { RespondentRecommendationItem } from "@/lib/recommendations/respondent-presentation";
import type { RespondentRecommendationView } from "@/lib/domain/workflow-status-keys";
import { respondentActionWorkspacePath } from "@/lib/navigation/respondent-portfolio-paths";
import { formSurface } from "@/lib/layout/form-surface";

const VIEW_ACCENT: Record<RespondentRecommendationView, string> = {
  open: "border-l-slate-300",
  awaiting_action: "border-l-amber-400",
  in_progress: "border-l-sky-400",
  resolved: "border-l-emerald-400",
  dismissed: "border-l-violet-300",
};

function nextStepCta(item: RespondentRecommendationItem): {
  href: string;
  label: string;
  primary: boolean;
} {
  const href = respondentActionWorkspacePath(item.recommendationId, "acoes");
  if (item.view === "awaiting_action") {
    return { href, label: "Cadastrar ações", primary: true };
  }
  if (item.view === "in_progress") {
    return { href, label: "Continuar", primary: true };
  }
  return { href, label: "Ver detalhes", primary: false };
}

type Props = {
  items: RespondentRecommendationItem[];
};

export function RespondentRecommendationList({ items }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (items.length === 0) return null;

  return (
    <ul className="flex flex-col gap-4 sm:gap-5" role="list" aria-label="Lista de recomendações">
      {items.map((item) => {
        const isOpen = expanded.has(item.recommendationId);
        const plan = planLinkSummary(item);
        const title = firstLineRecommendation(item.recommendationText);
        const cta = nextStepCta(item);
        const typeMeta = recommendationTypeEntry(item.recommendationType);
        const contextMeta = recommendationContextMeta(item);
        const showProgress = item.hasPlan || item.progress > 0;

        return (
          <li key={item.recommendationId} role="listitem">
            <article
              className={`overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm transition-shadow hover:shadow-md border-l-4 ${VIEW_ACCENT[item.view]} ${isOpen ? "ring-1 ring-brand-200/60" : ""}`}
            >
              <div className="flex flex-col gap-4 p-4 sm:gap-5 sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                  <RespondentRecommendationStatusBadge
                    view={item.view}
                    showIcon
                    className="self-start"
                  />
                  <Link
                    href={cta.href}
                    className={
                      cta.primary
                        ? `${formSurface.primaryButton} w-full justify-center sm:w-auto sm:min-w-44`
                        : `${formSurface.secondaryButton} w-full justify-center sm:w-auto`
                    }
                  >
                    {cta.label}
                    <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
                  </Link>
                </div>

                <div className="space-y-1.5 min-w-0">
                  <h3 className="text-base font-semibold leading-snug text-slate-900 sm:text-lg">
                    {title}
                  </h3>
                  <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">{contextMeta}</p>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 px-3.5 py-3 sm:px-4">
                  <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                    Motivo
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-xs font-medium ${typeMeta.colorClass}`}
                      title={recommendationTypeLabel(item.recommendationType)}
                    >
                      {recommendationTypeLabel(item.recommendationType)}
                    </span>
                    <span
                      className={
                        plan.tone === "warn"
                          ? "text-xs font-medium text-amber-800"
                          : "text-xs text-slate-600"
                      }
                    >
                      {plan.label}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-2">
                    {showProgress ? (
                      <div className="flex min-w-28 max-w-40 items-center gap-2">
                        <RespondentRecommendationProgress
                          value={item.progress}
                          size="sm"
                          label="Progresso"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500">Sem ações cadastradas</span>
                    )}
                    <span className="text-xs text-slate-500">
                      Atualizado{" "}
                      <time dateTime={item.updatedAt ?? item.createdAt}>
                        {formatRecommendationDate(item.updatedAt ?? item.createdAt)}
                      </time>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleExpand(item.recommendationId)}
                    aria-expanded={isOpen}
                    className={`${formSurface.ghostButton} self-start text-xs sm:self-auto`}
                  >
                    <ChevronDown
                      className={`h-4 w-4 transition ${isOpen ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                    {isOpen ? "Ocultar detalhes" : "Ver texto completo"}
                  </button>
                </div>

                {isOpen ? (
                  <div className="space-y-3 rounded-lg border border-dashed border-slate-200/90 bg-white px-3.5 py-3.5 sm:px-4">
                    <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {item.recommendationText}
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="font-medium text-slate-600">Pergunta vinculada:</span>{" "}
                      {item.questionPrompt}
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          </li>
        );
      })}
    </ul>
  );
}
