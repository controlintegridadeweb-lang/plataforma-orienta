"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, FileBarChart, RefreshCw } from "lucide-react";
import { ADMIN_RECOMENDACOES_HERO_IMAGE } from "@/lib/admin-recomendacoes-hero-image";
import {
  ADMIN_PAGE_HERO_ACTIONS,
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE,
  ADMIN_PAGE_HERO_IMAGE_SIZES,
  ADMIN_PAGE_HERO_LAYOUT,
  ADMIN_PAGE_HERO_MEDIA,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/admin-page-layout";
import type { AdminRecommendationSummary } from "@/lib/recommendations/admin-presentation";
import { formSurface } from "@/lib/form-surface";

type Props = {
  summary: AdminRecommendationSummary | null;
  loading?: boolean;
  onRefresh: () => void;
  onExport: () => void;
  reportHref?: string;
};

function buildSummaryLine(summary: AdminRecommendationSummary): {
  text: string;
  textClass: string;
} {
  if (summary.total === 0) {
    return { text: "Nenhuma recomendação no escopo atual.", textClass: "text-slate-600" };
  }
  if (summary.overdue > 0) {
    const overdueLabel =
      summary.overdue === 1 ? "1 recomendação atrasada" : `${summary.overdue} recomendações atrasadas`;
    const planLabel =
      summary.withoutPlan === 1
        ? "1 sem plano ativo"
        : `${summary.withoutPlan} sem plano ativo`;
    return {
      text: `${overdueLabel} · ${planLabel}.`,
      textClass: "text-rose-800",
    };
  }
  if (summary.withoutPlan > 0) {
    const n = summary.withoutPlan;
    return {
      text:
        n === 1
          ? "1 recomendação sem plano ativo."
          : `${n} recomendações sem plano ativo.`,
      textClass: "text-slate-700",
    };
  }
  const pct = summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);
  return {
    text: `${pct}% concluídas · ${summary.inExecution} em execução.`,
    textClass: "text-slate-600",
  };
}

/** Hero institucional de Recomendações (admin/analista). */
export function AdminRecommendationsHero({
  summary,
  loading,
  onRefresh,
  onExport,
  reportHref = "/admin/relatorios?focus=recomendacoes",
}: Props) {
  const summaryLine = summary ? buildSummaryLine(summary) : null;

  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Recomendações">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Análise estratégica</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Recomendações</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Gerencie recomendações geradas pelo processamento FAMI, acompanhe status, priorizações
            e vínculos com planos de ação institucionais.
          </p>

          {summaryLine ? (
            <p
              className={`mt-4 text-sm font-medium leading-relaxed ${summaryLine.textClass}`}
              role="status"
            >
              {summaryLine.text}
            </p>
          ) : null}

          <div className={ADMIN_PAGE_HERO_ACTIONS}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Atualizar
            </button>
            <button type="button" onClick={onExport} className={formSurface.secondaryButtonSm}>
              <Download className="h-3.5 w-3.5" aria-hidden />
              Exportar CSV
            </button>
            <Link href={reportHref} className={formSurface.primaryButtonSm}>
              <FileBarChart className="h-3.5 w-3.5" aria-hidden />
              Gerar relatório
            </Link>
          </div>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA}>
          <Image
            src={ADMIN_RECOMENDACOES_HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES}
            className={ADMIN_PAGE_HERO_IMAGE}
          />
        </div>
      </div>
    </header>
  );
}
