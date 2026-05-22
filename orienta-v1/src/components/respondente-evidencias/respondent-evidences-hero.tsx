"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, RefreshCw } from "lucide-react";
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

const HERO_IMAGE = "/assets/respondent-evidences-hero.png";

type Props = {
  onRefresh: () => void;
  refreshing: boolean;
};

/** Hero de Evidências e complementações — integrado ao `PageShell` (bleed no pai). */
export function RespondentEvidencesHero({ onRefresh, refreshing }: Props) {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label="Evidências e complementações">
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_COMPACT}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Acompanhamento de envios</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>Evidências e complementações</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Acompanhe o que você enviou, o status de validação do analista e responda pedidos de
            complementação pelos formulários.
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
            <Link href="/respondente/formularios" className={formSurface.primaryButtonSm}>
              Ir para meus formulários
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
