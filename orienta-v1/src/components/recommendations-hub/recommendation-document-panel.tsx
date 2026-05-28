"use client";

import Link from "next/link";
import { ChevronRight, ClipboardCopy, Sparkles } from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { RecommendationHistory } from "@/components/recomendacoes/recommendation-history";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";
import { notify } from "@/lib/notify";
import { recommendationTypeLabel } from "@/lib/domain/status-registry";
import {
  staffPlanoAcaoDetailHref,
  staffAreaFromPathname,
} from "@/lib/navigation/staff-paths";
import { OverviewContentBlock } from "./overview-content-block";
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

/** Página documental da recomendação — contexto, texto oficial, FAMI e histórico administrativo. */
export function RecommendationDocumentPanel() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const area = staffAreaFromPathname();

  if (!row) return null;

  const supervisaoHref =
    ctx.role === "staff"
      ? staffPlanoAcaoDetailHref(area, row.recommendationId, "monitoramento")
      : null;

  async function copyRecommendation() {
    try {
      await navigator.clipboard.writeText(row?.recommendationText ?? "");
      notify.success("Texto copiado.");
    } catch {
      notify.error("Não foi possível copiar.");
    }
  }

  return (
    <div className={layout.panelStack}>
      {ctx.role === "staff" && supervisaoHref ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-600">
            Para comentários, pareceres e validação, acesse o{" "}
            <strong className="font-medium text-slate-800">monitoramento do plano</strong>.
          </p>
          <Link
            href={supervisaoHref}
            className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1`}
          >
            Ir para monitoramento
            <ChevronRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      ) : null}

      <PanelSection
        title="Contexto"
        description="Origem institucional desta recomendação."
        variant="card"
        contentClassName="space-y-5"
      >
        <OverviewContentBlock title="Origem" description="Formulário, organização e classificação.">
          <dl className="grid gap-x-5 gap-y-2.5 text-sm sm:grid-cols-2">
            {row.questionPrompt ? (
              <div className="sm:col-span-2">
                <dt className={formSurface.label}>Pergunta de origem</dt>
                <dd className="mt-0.5 leading-relaxed text-slate-800">{row.questionPrompt}</dd>
              </div>
            ) : null}
            <div>
              <dt className={formSurface.label}>Eixo</dt>
              <dd className="mt-0.5 text-slate-800">{row.axisName || "—"}</dd>
            </div>
            <div>
              <dt className={formSurface.label}>Seção</dt>
              <dd className="mt-0.5 text-slate-800">{row.sectionName || "—"}</dd>
            </div>
            <div>
              <dt className={formSurface.label}>Formulário</dt>
              <dd className="mt-0.5 text-slate-800">
                {row.formName}
                {ctx.role === "staff" ? (
                  <span className="tabular-nums text-slate-400"> v{row.formVersion}</span>
                ) : null}
              </dd>
            </div>
            {ctx.role === "staff" ? (
              <div>
                <dt className={formSurface.label}>Organização</dt>
                <dd className="mt-0.5 text-slate-800">{row.organizationName}</dd>
              </div>
            ) : null}
            <div>
              <dt className={formSurface.label}>Gerada em</dt>
              <dd className="mt-0.5 tabular-nums text-slate-800">
                {row.recommendationCreatedAt ? formatDate(row.recommendationCreatedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className={formSurface.label}>Classificação</dt>
              <dd className="mt-0.5 text-slate-800">
                {recommendationTypeLabel(row.recommendationType)}
              </dd>
            </div>
          </dl>
        </OverviewContentBlock>
      </PanelSection>

      <PanelSection
        title="Recomendação oficial"
        description="Texto institucional a ser executado pela organização."
        variant="card"
      >
        <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-4 text-sm leading-relaxed text-slate-800">
          <p className="whitespace-pre-wrap">{row.recommendationText || "(sem texto)"}</p>
          <button
            type="button"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
            onClick={() => void copyRecommendation()}
          >
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
            Copiar texto completo
          </button>
        </div>
      </PanelSection>

      <PanelSection
        title="Impacto FAMI"
        description="Relação com eixo estrutural e maturidade institucional."
        variant="card"
      >
        <div className={`${formSurface.nestedCard} space-y-3`}>
          <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-brand-600" aria-hidden />
            Impacto esperado
          </p>
          <p className="text-sm leading-relaxed text-slate-600">
            Esta recomendação está vinculada ao eixo{" "}
            <strong className="font-medium text-slate-800">{row.axisName || "estrutural"}</strong>{" "}
            ({recommendationTypeLabel(row.recommendationType)}). A execução do plano de ação contribui
            para elevar a maturidade da organização neste eixo.
          </p>
        </div>
      </PanelSection>

      {ctx.role === "staff" ? (
        <PanelSection
          title="Histórico administrativo"
          description="Geração e alterações oficiais registradas pela equipe de supervisão."
          variant="card"
        >
          <RecommendationHistory recommendationId={ctx.recommendationId} />
        </PanelSection>
      ) : null}
    </div>
  );
}
