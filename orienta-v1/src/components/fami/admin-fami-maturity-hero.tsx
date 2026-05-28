"use client";

import Image from "next/image";
import { Download, RefreshCw } from "lucide-react";
import { ADMIN_MATURIDADE_HERO_IMAGE } from "@/lib/admin-maturidade-hero-image";
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
import { formSurface } from "@/lib/form-surface";

type Props = {
  summaryLine?: string | null;
  summaryClassName?: string;
  loading?: boolean;
  reprocessLoading?: boolean;
  ready?: boolean;
  reprocessDisabled?: boolean;
  reprocessTitle?: string;
  exportDisabled?: boolean;
  onRefresh: () => void;
  onExport: () => void;
  onReprocess: () => void;
};

/** Hero institucional de Maturidade FAMI (admin). */
export function AdminFamiMaturityHero({
  summaryLine,
  summaryClassName = "text-slate-600",
  loading,
  reprocessLoading,
  ready = true,
  reprocessDisabled,
  reprocessTitle,
  exportDisabled,
  onRefresh,
  onExport,
  onReprocess,
}: Props) {
  const staticSummary =
    "Nível institucional calculado automaticamente com base nas respostas, evidências e processamento FAMI.";

  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Maturidade FAMI">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Indicadores de maturidade</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Maturidade FAMI</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Acompanhe evolução institucional, desempenho por eixo e consolidação da maturidade
            organizacional.
          </p>

          <p
            className={`mt-4 text-sm font-medium leading-relaxed ${summaryLine ? summaryClassName : "text-slate-600"}`}
            role="status"
          >
            {summaryLine ?? staticSummary}
          </p>

          <div className={ADMIN_PAGE_HERO_ACTIONS}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={!ready || loading}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              {loading ? "Atualizando…" : "Atualizar"}
            </button>
            <button
              type="button"
              onClick={onExport}
              disabled={exportDisabled}
              className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Exportar CSV
            </button>
            <button
              type="button"
              onClick={onReprocess}
              disabled={!ready || reprocessLoading || reprocessDisabled}
              title={reprocessTitle}
              className={`${formSurface.primaryButtonSm} disabled:opacity-50`}
            >
              {reprocessLoading ? "Recalculando…" : "Recalcular agora"}
            </button>
          </div>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA}>
          <Image
            src={ADMIN_MATURIDADE_HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES}
            className={`${ADMIN_PAGE_HERO_IMAGE} opacity-90`}
          />
        </div>
      </div>
    </header>
  );
}
