"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download, RefreshCw } from "lucide-react";
import { RESPONDENT_MODULE_CONTEXT } from "@/lib/respondent-module-context";
import { RESPONDENT_RECOMMENDATIONS_MODULE_LABEL } from "@/lib/navigation/respondent-portfolio-paths";
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

/** Hero de Recomendações e plano — integrado ao `PageShell` (bleed no pai). */
export function RespondentRecommendationsHero({ onRefresh, refreshing, onExport }: Props) {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label={RESPONDENT_RECOMMENDATIONS_MODULE_LABEL}>
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_COMPACT}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Gestão estratégica</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>{RESPONDENT_RECOMMENDATIONS_MODULE_LABEL}</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Visão em cards: status, motivo e próximo passo em destaque. Cadastre prazos,
            responsáveis e acompanhe entregas no workspace de cada recomendação.
          </p>
          <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500">
            {RESPONDENT_MODULE_CONTEXT}
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
            <Link
              href="/respondente/portfolio-recomendacoes?view=awaiting_action"
              className={formSurface.primaryButtonSm}
            >
              Ver pendentes
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
