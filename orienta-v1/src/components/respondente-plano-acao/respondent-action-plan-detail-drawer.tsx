"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, FileCheck2, Lightbulb } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import type { RespondentActionPlanItem } from "@/lib/action-plans/respondent-presentation";
import { RecommendationTypeBadge } from "@/components/recomendacoes/recommendation-type-badge";
import { formSurface } from "@/lib/form-surface";
import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";
import { RespondentActionPlanForm } from "./respondent-action-plan-form";
import { RespondentActionPlanStatusBadge } from "./respondent-action-plan-status-badge";
import { RespondentActionPlanTimeline } from "./respondent-action-plan-timeline";

type Props = {
  open: boolean;
  item: RespondentActionPlanItem | null;
  onClose: () => void;
  onSaved: () => void;
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleDateString("pt-BR");
  } catch {
    return "—";
  }
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/\s+/g, " ");
}

function ActionPlanDrawerRecommendationBlock({ item }: { item: RespondentActionPlanItem }) {
  const [showFullRecommendation, setShowFullRecommendation] = useState(false);
  const recNorm = normalizeText(item.recommendationText);
  const descNorm = normalizeText(item.description);
  const recommendationDuplicatesPlan =
    item.hasPlan && recNorm.length > 0 && recNorm === descNorm;

  return (
    <section className="space-y-2">
      <h3 className={formSurface.label}>
        <Lightbulb className="mr-1 inline h-3.5 w-3.5" aria-hidden />
        Recomendação original
      </h3>
      <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm leading-relaxed text-slate-800">
        {recommendationDuplicatesPlan ? (
          <div className="space-y-2">
            <p className="text-[13px] leading-snug text-slate-600">
              O texto da recomendação coincide com o texto registrado nesta linha. Ajuste pelo
              formulário abaixo; expanda apenas se precisar conferir o integral.
            </p>
            {showFullRecommendation ? (
              <p className="whitespace-pre-wrap text-slate-800">{item.recommendationText}</p>
            ) : (
              <button
                type="button"
                className="text-[11px] font-semibold text-brand-700 hover:underline"
                onClick={() => setShowFullRecommendation(true)}
              >
                Mostrar texto completo da recomendação
              </button>
            )}
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{item.recommendationText || "—"}</p>
        )}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
          <Link
            href={`${RESPONDENT_PORTFOLIO_LIST_PATH}#portfolio-rec-${item.recommendationId}`}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 hover:underline"
          >
            Ver no Portfólio
            <ExternalLink className="h-3 w-3" aria-hidden />
          </Link>
          <span>
            <span className="font-semibold text-slate-600">Status:</span>{" "}
            {item.recommendationStatus}
          </span>
        </div>
      </div>
    </section>
  );
}

export function RespondentActionPlanDetailDrawer({ open, item, onClose, onSaved }: Props) {
  if (!item) {
    return (
      <Drawer open={open} onClose={onClose} title="Detalhes">
        <></>
      </Drawer>
    );
  }

  const isDraftNew = item.rowKey.startsWith("draft-new");
  const drawerTitle = isDraftNew ? "Nova ação nesta recomendação" : item.title;
  const drawerDescription = [
    item.formName || "Formulário",
    item.totalActionsForRecommendation > 1
      ? `${item.totalActionsForRecommendation} ações cadastradas nesta recomendação`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={drawerTitle}
      description={drawerDescription}
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <RespondentActionPlanStatusBadge view={item.view} />
          {item.recommendationType ? (
            <RecommendationTypeBadge type={item.recommendationType} />
          ) : null}
        </div>

        <section className="grid gap-3 sm:grid-cols-2">
          <DescriptionItem label="Eixo" value={item.axisName || "—"} />
          <DescriptionItem label="Seção" value={item.sectionName || "—"} />
          <DescriptionItem label="Formulário" value={item.formName || "—"} />
          <DescriptionItem label="Prazo" value={formatDate(item.dueDate)} />
          <DescriptionItem
            label="Responsável"
            value={
              item.responsibleName
                ? `${item.responsibleName}${item.responsibleSector ? ` · ${item.responsibleSector}` : ""}`
                : "—"
            }
          />
          <DescriptionItem label="Atualizado em" value={formatDate(item.updatedAt)} />
        </section>

        <ActionPlanDrawerRecommendationBlock key={item.recommendationId} item={item} />

        {item.questionPrompt ? (
          <section className="space-y-1.5">
            <h3 className={formSurface.label}>Pergunta original</h3>
            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-700">
              {item.questionPrompt}
            </div>
          </section>
        ) : null}

        <section className="space-y-2.5">
          <h3 className={formSurface.label}>
            <FileCheck2 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {item.hasPlan
              ? "Atualizar esta ação"
              : isDraftNew
                ? "Cadastrar nova linha (nova ação)"
                : "Cadastrar primeira ação"}
          </h3>
          <RespondentActionPlanForm item={item} onSaved={onSaved} />
        </section>

        <section className="space-y-2">
          <h3 className={formSurface.label}>Linha do tempo · auditoria da ação</h3>
          <RespondentActionPlanTimeline planId={item.planId} />
        </section>
      </div>
    </Drawer>
  );
}

function DescriptionItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      <p className="text-sm text-slate-800">{value}</p>
    </div>
  );
}
