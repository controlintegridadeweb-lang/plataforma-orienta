import Image from "next/image";
import {
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

const HERO_IMAGE = "/assets/respondent-dashboard-hero.png";

type Props = {
  year: number;
};

/** Hero integrado ao painel principal do dashboard do respondente. */
export function RespondentDashboardHero({ year }: Props) {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label="Visão geral do dashboard">
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_TALL}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_TALL}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Painel de acompanhamento</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>Seu dashboard</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Acompanhe formulários, complementações e o progresso das respostas da sua
            organização no ano de {year}.
          </p>
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
