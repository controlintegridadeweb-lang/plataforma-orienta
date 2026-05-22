"use client";

import { useEffect, useState } from "react";
import { ClipboardCopy } from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { Spinner } from "@/components/ui/loading";
import { RecommendationActions } from "@/components/recomendacoes/recommendation-actions";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";
import { notify } from "@/lib/notify";
import { listRecommendations } from "@/lib/recommendations/client";
import type { RecommendationListItem } from "@/lib/recommendations/admin-service";
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

export function RecommendationOverviewPanel() {
  const ctx = useRecommendationDetailContext();
  const row = ctx.row;
  const [editable, setEditable] = useState<RecommendationListItem | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [staffErr, setStaffErr] = useState<string | null>(null);

  useEffect(() => {
    if (ctx.role !== "staff" || !ctx.recommendationId) return;
    let cancelled = false;
    async function load() {
      setLoadingStaff(true);
      setStaffErr(null);
      try {
        const res = await listRecommendations({
          recommendationId: ctx.recommendationId,
          limit: 1,
          offset: 0,
        });
        const found = res.items[0] ?? null;
        if (!cancelled) setEditable(found);
      } catch (e) {
        if (!cancelled)
          setStaffErr(e instanceof Error ? e.message : "Falha ao carregar gestão da recomendação.");
      } finally {
        if (!cancelled) setLoadingStaff(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [ctx.role, ctx.recommendationId]);

  if (!row) return null;

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
      <PanelSection
        title="Visão geral"
        description="Contexto, pergunta de origem e recomendação oficial."
        variant="card"
        contentClassName="space-y-5"
      >
        <OverviewContentBlock title="Contexto" description="Origem no formulário e na organização.">
          <dl className="grid gap-x-5 gap-y-2.5 text-sm sm:grid-cols-2">
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
              <dd className="mt-0.5 text-slate-800">{row.formName}</dd>
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
          </dl>
        </OverviewContentBlock>

        {row.questionPrompt ? (
          <OverviewContentBlock
            title="Pergunta original"
            description="Questão do formulário que originou esta recomendação."
            borderedTop
          >
            <p className="text-sm leading-relaxed text-slate-700">{row.questionPrompt}</p>
          </OverviewContentBlock>
        ) : null}

        <OverviewContentBlock
          title="Recomendação"
          description="Texto oficial a ser executado no plano de ação."
          borderedTop
        >
          <div className="rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-800">
            <p className="whitespace-pre-wrap">{row.recommendationText || "(sem texto)"}</p>
            <button
              type="button"
              className="mt-2.5 inline-flex items-center gap-1 text-xs font-medium text-slate-600 transition hover:text-slate-900"
              onClick={() => void copyRecommendation()}
            >
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              Copiar texto completo
            </button>
          </div>
        </OverviewContentBlock>
      </PanelSection>

      {ctx.role === "staff" ? (
        <PanelSection
          title="Gestão da recomendação"
          description="Status e ações administrativas."
          variant="card"
        >
          {loadingStaff ? (
            <p className="inline-flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Carregando…
            </p>
          ) : staffErr ? (
            <p className={formSurface.messageError}>{staffErr}</p>
          ) : editable ? (
            <RecommendationActions
              item={editable}
              onUpdated={(result) => {
                setEditable(result.item);
                void ctx.refetch();
              }}
            />
          ) : (
            <p className="text-sm text-slate-500">Não foi possível carregar o painel de edição.</p>
          )}
        </PanelSection>
      ) : null}
    </div>
  );
}
