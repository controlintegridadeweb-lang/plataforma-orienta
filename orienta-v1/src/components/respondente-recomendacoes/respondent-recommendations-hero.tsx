"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, RefreshCw } from "lucide-react";
import { formSurface } from "@/lib/form-surface";
import {
  RESPONDENT_PAGE_HERO_ACTIONS,
  RESPONDENT_PAGE_HERO_CLASS,
  RESPONDENT_PAGE_HERO_CONTENT_COMPACT,
  RESPONDENT_PAGE_HERO_DESCRIPTION,
  RESPONDENT_PAGE_HERO_IMAGE_COMPACT,
  RESPONDENT_PAGE_HERO_IMAGE_SIZES_COMPACT,
  RESPONDENT_PAGE_HERO_LAYOUT_COMPACT,
  RESPONDENT_PAGE_HERO_MEDIA_COMPACT,
  RESPONDENT_PAGE_HERO_OVERLINE,
  RESPONDENT_PAGE_HERO_TITLE,
} from "@/lib/respondent-page-layout";

const HERO_IMAGE = "/assets/respondent-recommendations-hero.png";

type Props = {
  onRefresh: () => void;
  refreshing: boolean;
  onExport?: () => void;
};

/** Hero do Portfólio de recomendações — integrado ao `PageShell` (bleed no pai). */
export function RespondentRecommendationsHero({ onRefresh, refreshing, onExport }: Props) {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label="Portfólio de recomendações">
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_COMPACT}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Gestão estratégica</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>Portfólio de recomendações</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Central estratégica: veja status e quantidade de ações. Para cadastrar prazos,
            responsáveis e monitorar entregas, abra o plano de ação da recomendação.
          </p>

          <div className={RESPONDENT_PAGE_HERO_ACTIONS}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={formSurface.secondaryButtonSm}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Atualizar
            </button>
            {onExport ? (
              <button
                type="button"
                onClick={onExport}
                className={formSurface.secondaryButtonSm}
              >
                <Download className="h-3.5 w-3.5" aria-hidden />
                Exportar
              </button>
            ) : null}
            <Link href="/respondente/plano-acao" className={formSurface.primaryButtonSm}>
              Ir para Plano de Ação
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        </div>

        <div className={RESPONDENT_PAGE_HERO_MEDIA_COMPACT}>
          <Image
            src={HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={RESPONDENT_PAGE_HERO_IMAGE_SIZES_COMPACT}
            className={RESPONDENT_PAGE_HERO_IMAGE_COMPACT}
          />
        </div>
      </div>
    </header>
  );
}
