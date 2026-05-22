"use client";

import Image from "next/image";
import { Download, History, RefreshCw } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import {
  RESPONDENT_PAGE_HERO_ACTIONS,
  RESPONDENT_PAGE_HERO_CLASS,
  RESPONDENT_PAGE_HERO_CONTENT_TALL,
  RESPONDENT_PAGE_HERO_DESCRIPTION,
  RESPONDENT_PAGE_HERO_IMAGE_SIZES_TALL,
  RESPONDENT_PAGE_HERO_IMAGE_TALL,
  RESPONDENT_PAGE_HERO_LAYOUT_TALL,
  RESPONDENT_PAGE_HERO_MEDIA_TALL,
  RESPONDENT_PAGE_HERO_OVERLINE,
  RESPONDENT_PAGE_HERO_TITLE,
} from "@/lib/respondent-page-layout";

const HERO_IMAGE = "/assets/respondent-reports-hero.png";

type Props = {
  loading: boolean;
  onRefresh: () => void;
  onExportAll: () => void;
  onScrollHistory: () => void;
};

/** Hero de Relatórios — integrado ao `PageShell` (bleed no pai). */
export function RespondentReportsHero({
  loading,
  onRefresh,
  onExportAll,
  onScrollHistory,
}: Props) {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label="Relatórios">
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_TALL}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_TALL}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Documentos e análise</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>Relatórios</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Gere PDFs oficiais com base no processamento FAMI e consulte o histórico de
            exportações, pré-visualizações e regenerações da organização.
          </p>

          <div className={RESPONDENT_PAGE_HERO_ACTIONS}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className={formSurface.secondaryButtonSm}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                aria-hidden
              />
              Atualizar
            </button>
            <button
              type="button"
              onClick={onExportAll}
              disabled={loading}
              className={formSurface.secondaryButtonSm}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
              Exportar tudo
            </button>
            <button
              type="button"
              onClick={onScrollHistory}
              className={formSurface.primaryButtonSm}
            >
              <History className="h-3.5 w-3.5" aria-hidden />
              Histórico
            </button>
          </div>
        </div>

        <div className={RESPONDENT_PAGE_HERO_MEDIA_TALL}>
          <Image
            src={HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={RESPONDENT_PAGE_HERO_IMAGE_SIZES_TALL}
            className={RESPONDENT_PAGE_HERO_IMAGE_TALL}
          />
        </div>
      </div>
    </header>
  );
}
