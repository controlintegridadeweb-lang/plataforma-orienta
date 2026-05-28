import type { ReactNode } from "react";
import { FilePlus } from "lucide-react";
import { AdminNewFormHero } from "@/components/admin-formularios/admin-new-form-hero";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { layout, typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";

type Props = {
  backHref: string;
  backLabel?: string;
  children: ReactNode;
};

/** Shell institucional da página de criação de formulário (admin). */
export function NewFormShell({ backHref, backLabel, children }: Props) {
  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminNewFormHero backHref={backHref} backLabel={backLabel} />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
        <section className={layout.sectionStack} aria-label="Dados do formulário">
          <p className={typography.sectionLabel}>Cadastro</p>

          <div className={formSurface.dashboardPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 md:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <FilePlus className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-slate-900">Dados do formulário</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Defina o nome de exibição do modelo. Perguntas, vínculos e publicação são
                    configurados nas etapas seguintes.
                  </p>
                </div>
              </div>
            </div>

            <div className={formSurface.dashboardPanelPadding}>{children}</div>
          </div>
        </section>
      </div>
    </div>
  );
}
