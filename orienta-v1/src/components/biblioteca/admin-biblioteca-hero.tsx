"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { ADMIN_BIBLIOTECA_HERO_IMAGE } from "@/lib/config/page-assets/admin-biblioteca-hero-image";
import {
  ADMIN_PAGE_HERO_ACTIONS,
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE_COMPACT,
  ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT,
  ADMIN_PAGE_HERO_LAYOUT_COMPACT,
  ADMIN_PAGE_HERO_MEDIA_COMPACT,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/layout/admin-page-layout";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  onNewAxis: () => void;
  onNewSection: () => void;
};

/** Hero institucional da Biblioteca Geral (admin). */
export function AdminBibliotecaHero({ onNewAxis, onNewSection }: Props) {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Biblioteca Geral">
      <div className={ADMIN_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Catálogo institucional</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Biblioteca Geral</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Gerencie e organize eixos, seções e conteúdos reutilizáveis utilizados nos diagnósticos
            institucionais da plataforma.
          </p>

          <div className={ADMIN_PAGE_HERO_ACTIONS}>
            <button type="button" onClick={onNewAxis} className={formSurface.primaryButtonSm}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Novo eixo
            </button>
            <button type="button" onClick={onNewSection} className={formSurface.secondaryButtonSm}>
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Nova seção
            </button>
          </div>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA_COMPACT}>
          <Image
            src={ADMIN_BIBLIOTECA_HERO_IMAGE}
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
