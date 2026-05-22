import Image from "next/image";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/form-workspace-hero-image";
import {
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT_CREATE,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE_CREATE,
  ADMIN_PAGE_HERO_IMAGE_SIZES_CREATE,
  ADMIN_PAGE_HERO_LAYOUT_CREATE,
  ADMIN_PAGE_HERO_MEDIA_CREATE,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/admin-page-layout";

type Props = {
  backHref: string;
  backLabel?: string;
};

/** Hero compacto da criação de formulário — alinhado ao padrão admin institucional. */
export function AdminNewFormHero({
  backHref,
  backLabel = "Voltar para a lista",
}: Props) {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Novo formulário">
      <div className={ADMIN_PAGE_HERO_LAYOUT_CREATE}>
        <div className={ADMIN_PAGE_HERO_CONTENT_CREATE}>
          <Link
            href={backHref}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand/40"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
            {backLabel}
          </Link>

          <p className={ADMIN_PAGE_HERO_OVERLINE}>Gestão de formulários</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Novo formulário</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Crie um modelo em rascunho. Na sequência você adiciona perguntas, vínculos da biblioteca e
            publica quando o fluxo estiver completo.
          </p>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA_CREATE}>
          <Image
            src={FORM_WORKSPACE_HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES_CREATE}
            className={ADMIN_PAGE_HERO_IMAGE_CREATE}
          />
        </div>
      </div>
    </header>
  );
}
