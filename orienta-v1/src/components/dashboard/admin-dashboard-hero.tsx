import Image from "next/image";
import {
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

const HERO_IMAGE = "/assets/admin-dashboard-hero.png";

/** Hero institucional do dashboard administrativo (sem métricas — KPIs carregam em streaming). */
export function AdminDashboardHero() {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Dashboard administrativo">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Painel administrativo</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Dashboard administrativo</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Acompanhe formulários, evidências, recomendações, planos de ação e indicadores
            institucionais da plataforma.
          </p>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA}>
          <Image
            src={HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            loading="lazy"
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES}
            className={ADMIN_PAGE_HERO_IMAGE}
          />
        </div>
      </div>
    </header>
  );
}
