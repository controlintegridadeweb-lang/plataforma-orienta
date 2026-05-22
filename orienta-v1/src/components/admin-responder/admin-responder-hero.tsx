import Image from "next/image";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/form-workspace-hero-image";
import {
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE_COMPACT,
  ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT,
  ADMIN_PAGE_HERO_LAYOUT,
  ADMIN_PAGE_HERO_MEDIA,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/admin-page-layout";

/** Hero institucional da capacidade "Responder por organização" no admin. */
export function AdminResponderHero() {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Responder por organização">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Responder por organização</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Responder em nome da organização</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Escolha a organização e o formulário. As respostas ficam vinculadas a ela,
            com a sua autoria registrada para auditoria.
          </p>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA}>
          <Image
            src={FORM_WORKSPACE_HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT}
            className={ADMIN_PAGE_HERO_IMAGE_COMPACT}
          />
        </div>
      </div>
    </header>
  );
}
