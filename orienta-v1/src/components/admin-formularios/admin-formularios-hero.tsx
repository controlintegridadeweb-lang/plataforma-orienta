import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/config/page-assets/form-workspace-hero-image";
import {
  ADMIN_PAGE_HERO_ACTIONS,
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE_COMPACT,
  ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT,
  ADMIN_PAGE_HERO_LAYOUT,
  ADMIN_PAGE_HERO_MEDIA,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/layout/admin-page-layout";
import { formSurface } from "@/lib/layout/form-surface";

/** Hero institucional da lista de formulários (admin). */
export function AdminFormulariosHero() {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Formulários">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Gestão de formulários</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Formulários</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Crie, organize e publique formulários utilizados nos diagnósticos institucionais da
            plataforma.
          </p>

          <div className={ADMIN_PAGE_HERO_ACTIONS}>
            <Link href="/admin/formularios/novo" className={formSurface.primaryButtonSm}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Novo formulário
            </Link>
          </div>
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
