import type { ReactNode } from "react";
import { FormEditHero } from "@/components/formulario/form-edit-hero";
import { FormTabs } from "@/components/formulario/form-tabs";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";

type Props = {
  formId: string;
  formName: string;
  state: string;
  archived: boolean;
  backHref: string;
  backLabel: string;
  scope?: "admin" | "analista";
  showTabs?: boolean;
  children: ReactNode;
};

/** Shell das telas internas do formulário — hero institucional + abas + conteúdo. */
export function FormEditShell({
  formId,
  formName,
  state,
  archived,
  backHref,
  backLabel,
  scope = "admin",
  showTabs = true,
  children,
}: Props) {
  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <article className={`${formSurface.card} overflow-hidden`}>
          <FormEditHero
            formName={formName}
            state={state}
            archived={archived}
            backHref={backHref}
            backLabel={backLabel}
          />
          {showTabs ? <FormTabs formId={formId} scope={scope} embedded /> : null}
          <div className="bg-white px-4 py-5 sm:px-6 sm:py-6 md:px-7">{children}</div>
        </article>
      </div>
    </div>
  );
}
