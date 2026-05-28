import Image from "next/image";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/config/page-assets/form-workspace-hero-image";
import {
  RESPONDENT_PAGE_HERO_CLASS,
  RESPONDENT_PAGE_HERO_CONTENT_COMPACT,
  RESPONDENT_PAGE_HERO_DESCRIPTION,
  RESPONDENT_PAGE_HERO_IMAGE_COMPACT,
  RESPONDENT_PAGE_HERO_IMAGE_SIZES_COMPACT,
  RESPONDENT_PAGE_HERO_LAYOUT_COMPACT,
  RESPONDENT_PAGE_HERO_MEDIA_COMPACT,
  RESPONDENT_PAGE_HERO_OVERLINE,
  RESPONDENT_PAGE_HERO_TITLE,
} from "@/lib/layout/respondent-page-layout";

/** Hero de Meus formulários — mesmo padrão do dashboard, evidências e relatórios. */
export function RespondentFormulariosHero() {
  return (
    <header className={RESPONDENT_PAGE_HERO_CLASS} aria-label="Meus formulários">
      <div className={RESPONDENT_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={RESPONDENT_PAGE_HERO_CONTENT_COMPACT}>
          <p className={RESPONDENT_PAGE_HERO_OVERLINE}>Área de resposta</p>
          <h2 className={RESPONDENT_PAGE_HERO_TITLE}>Meus formulários</h2>
          <p className={RESPONDENT_PAGE_HERO_DESCRIPTION}>
            Acompanhe o progresso, pendências e complementações dos diagnósticos da sua
            organização.
          </p>
        </div>

        <div className={RESPONDENT_PAGE_HERO_MEDIA_COMPACT}>
          <Image
            src={FORM_WORKSPACE_HERO_IMAGE}
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
