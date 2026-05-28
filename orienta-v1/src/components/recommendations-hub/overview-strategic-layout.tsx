"use client";

import { ClipboardCopy, Sparkles } from "lucide-react";
import { RecommendationTypeBadge } from "@/components/recomendacoes/recommendation-type-badge";
import { RespondentRecommendationStatusBadge } from "@/components/respondente-recomendacoes/respondent-recommendation-status-badge";
import { AdminRecommendationStatusBadge } from "@/components/admin-recomendacoes/admin-recommendation-status-badge";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import { notify } from "@/lib/notify";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import { useRecommendationDetailContext } from "./recommendation-detail-context";

function formatDate(value: string | undefined | null): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <dt className="text-2xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 text-sm font-medium text-slate-900 line-clamp-2">{value}</dd>
    </div>
  );
}

type Props = {
  row: ActionPlanListItem;
};

/** Layout institucional resumido — aba Visão geral. */
export function OverviewStrategicLayout({ row }: Props) {
  const ctx = useRecommendationDetailContext();

  async function copyRecommendation() {
    try {
      await navigator.clipboard.writeText(row.recommendationText ?? "");
      notify.success("Texto copiado.");
    } catch {
      notify.error("Não foi possível copiar.");
    }
  }

  const executiveSummary = row.recommendationText.split(/\n+/)[0]?.trim() ?? "";

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* Status institucional — uma linha */}
      <div className="flex flex-wrap items-center gap-2">
        {ctx.role === "respondent" && ctx.respondentItem ? (
          <RespondentRecommendationStatusBadge view={ctx.respondentItem.view} showIcon />
        ) : ctx.staffItem ? (
          <AdminRecommendationStatusBadge view={ctx.staffItem.view} />
        ) : null}
        {row.recommendationType ? (
          <RecommendationTypeBadge type={row.recommendationType} />
        ) : null}
        <span className={`${typography.meta} ml-auto`}>
          Gerada em {formatDate(row.recommendationCreatedAt)}
        </span>
      </div>

      {/* Recomendação principal */}
      <section className="space-y-3">
        <p className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
          Recomendação oficial
        </p>
        {executiveSummary && executiveSummary.length < row.recommendationText.trim().length ? (
          <p className="text-lg font-semibold leading-snug text-slate-900 sm:text-xl">
            {executiveSummary}
          </p>
        ) : null}
        <div className="rounded-xl border border-slate-200/90 bg-slate-50/40 px-5 py-5 sm:px-6">
          <p className="text-sm leading-relaxed text-slate-800 whitespace-pre-wrap sm:text-body-15">
            {row.recommendationText || "(sem texto)"}
          </p>
          <button
            type="button"
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition hover:text-slate-900"
            onClick={() => void copyRecommendation()}
          >
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
            Copiar texto completo
          </button>
        </div>
      </section>

      {/* Contexto compacto */}
      <section className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Contexto</h2>
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetaChip label="Formulário" value={row.formName} />
          <MetaChip label="Eixo" value={row.axisName || "—"} />
          <MetaChip label="Seção" value={row.sectionName || "—"} />
          {ctx.role === "staff" ? (
            <MetaChip label="Organização" value={row.organizationName} />
          ) : (
            <MetaChip
              label="Tipo"
              value={recommendationTypeLabel(row.recommendationType)}
            />
          )}
        </dl>
      </section>

      {/* Pergunta */}
      {row.questionPrompt ? (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-900">Pergunta original</h2>
          <blockquote className="border-l-4 border-slate-300/80 bg-white px-4 py-3 text-sm italic leading-relaxed text-slate-600">
            {row.questionPrompt}
          </blockquote>
        </section>
      ) : null}

      {/* Impacto FAMI */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Impacto FAMI</h2>
        <div className={`${formSurface.nestedCard} flex gap-3 sm:gap-4`}>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
            <Sparkles className="h-5 w-5" aria-hidden />
          </span>
          <div className="min-w-0 space-y-1.5 text-sm leading-relaxed text-slate-600">
            <p>
              Vinculada ao eixo{" "}
              <strong className="font-medium text-slate-800">
                {row.axisName || "estrutural"}
              </strong>{" "}
              — {recommendationTypeLabel(row.recommendationType)}.
            </p>
            <p>
              A execução das ações neste plano contribui para elevar a maturidade da organização
              neste eixo no próximo ciclo de avaliação.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
