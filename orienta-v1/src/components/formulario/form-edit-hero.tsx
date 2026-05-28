import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FormStateBadge } from "@/components/formulario/form-state-badge";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/config/page-assets/form-workspace-hero-image";
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
} from "@/lib/layout/admin-page-layout";
import { formSurface } from "@/lib/layout/form-surface";

type Props = {
  formName: string;
  state: string;
  archived: boolean;
  backHref: string;
  backLabel: string;
};

/** Hero institucional do editor de formulário (sem gradiente). */
export function FormEditHero({
  formName,
  state,
  archived,
  backHref,
  backLabel,
}: Props) {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label={formName}>
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <Link
            href={backHref}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/40"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {backLabel}
          </Link>

          <p className={ADMIN_PAGE_HERO_OVERLINE}>Gestão de diagnóstico</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>{formName}</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Edite perguntas, vínculos da biblioteca, configurações e acompanhe as respostas do
            formulário.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2 sm:mt-5">
            <FormStateBadge state={state} />
            {archived ? (
              <span className={`${formSurface.badge.base} ${formSurface.badge.warning}`}>
                Arquivado
              </span>
            ) : null}
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
