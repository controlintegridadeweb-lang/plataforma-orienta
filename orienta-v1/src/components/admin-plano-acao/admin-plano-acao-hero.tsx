"use client";

import Image from "next/image";
import Link from "next/link";
import { Download, FileBarChart, RefreshCw } from "lucide-react";
import { ADMIN_PLANO_ACAO_HERO_IMAGE } from "@/lib/config/page-assets/admin-plano-acao-hero-image";
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
} from "@/lib/layout/admin-page-layout";
import type { AdminPlanSummary } from "@/lib/action-plans/admin-monitoring";
import { STAFF_ANALYSIS_MODULE_CONTEXT } from "@/lib/layout/staff-module-context";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  summary: AdminPlanSummary | null;
  loading?: boolean;
  onRefresh: () => void;
  onExport: () => void;
  reportHref?: string;
};

function buildSummaryLine(summary: AdminPlanSummary): {
  text: string;
  textClass: string;
} {
  if (summary.total === 0) {
    return { text: "Nenhuma ação no escopo atual.", textClass: "text-slate-600" };
  }

  const pct =
    summary.total === 0 ? 0 : Math.round((summary.completed / summary.total) * 100);
  const execLabel =
    summary.inProgress === 1
      ? "1 ação em execução"
      : `${summary.inProgress} ações em execução`;

  if (summary.overdue > 0) {
    return {
      text: `${summary.overdue} atrasada(s) · ${pct}% concluído · ${execLabel}.`,
      textClass: "text-rose-800",
    };
  }

  return {
    text: `${pct}% concluído · ${execLabel}.`,
    textClass: "text-slate-700",
  };
}

/** Hero institucional de Plano de Ação (admin). */
export function AdminActionPlanHero({
  summary,
  loading,
  onRefresh,
  onExport,
  reportHref = "/admin/relatorios?focus=planos-acao",
}: Props) {
  const summaryLine = summary ? buildSummaryLine(summary) : null;

  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Plano de Ação">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Execução e monitoramento</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Plano de Ação</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Fila operacional de ações, prazos, responsáveis e progresso vinculados às
            recomendações. O acompanhamento institucional fica na aba Monitoramento de cada plano.
          </p>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
            {STAFF_ANALYSIS_MODULE_CONTEXT}
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
            src={ADMIN_PLANO_ACAO_HERO_IMAGE}
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
