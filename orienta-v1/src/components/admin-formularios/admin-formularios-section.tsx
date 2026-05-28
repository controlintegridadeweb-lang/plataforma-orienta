import { ClipboardList } from "lucide-react";
import { AdminFormulariosHero } from "@/components/admin-formularios/admin-formularios-hero";
import { FormsList } from "@/components/formulario/forms-list";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/layout/admin-page-layout";
import { layout, typography } from "@/lib/layout/design-system";
import { formSurface } from "@/lib/layout/form-surface";

/** Página de listagem de formulários do administrador. */
export function AdminFormulariosSection() {
  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminFormulariosHero />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
        <section className={layout.sectionStack} aria-label="Modelos cadastrados">
          <p className={typography.sectionLabel}>Modelos</p>

          <div className={formSurface.dashboardPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-6 md:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <ClipboardList className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-slate-900">Modelos cadastrados</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Publique quando perguntas e vínculos estiverem completos.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${formSurface.dashboardPanelPadding} pt-5`}>
              <FormsList />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
