import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, Inbox } from "lucide-react";
import { AnalistaFormulariosHero } from "@/components/analista-formularios/analista-formularios-hero";
import { FormsList } from "@/components/formulario/forms-list";
import type { OrganizationFormsGroup } from "@/lib/dashboards/queries";
import { formStateLabelPt } from "@/lib/respondent/form-labels";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { layout, typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";

type Props = {
  groupsWithForms: OrganizationFormsGroup[];
};

/** Listagem de formulários do analista — hero bleed + painéis (sem PageCardShell duplo). */
export function AnalistaFormulariosSection({ groupsWithForms }: Props) {
  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AnalistaFormulariosHero />
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
                    Rascunhos, perguntas, vínculos e publicação — exceto exclusão definitiva.
                  </p>
                </div>
              </div>
            </div>
            <div className={`${formSurface.dashboardPanelPadding} pt-5`}>
              <FormsList formBasePath="/analista/formularios" showDelete={false} />
            </div>
          </div>
        </section>

        <section className={layout.sectionStack} aria-label="Responder por organização">
          <p className={typography.sectionLabel}>Responder</p>
          <div className={formSurface.dashboardPanel}>
            <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 md:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                  <Building2 className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-medium text-slate-900">
                    Formulários para responder
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Escolha a organização e o formulário. As respostas ficam vinculadas a ela, com
                    a sua autoria de analista.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${formSurface.dashboardPanelPadding} pt-5`}>
              {groupsWithForms.length === 0 ? (
                <div className={formSurface.empty.container}>
                  <span className={formSurface.empty.iconWrap}>
                    <Inbox className="h-5 w-5" aria-hidden />
                  </span>
                  <p className={formSurface.empty.title}>
                    Nenhum formulário disponível para resposta
                  </p>
                  <p className={formSurface.empty.description}>
                    Não há organizações com formulários ativos no período.
                  </p>
                </div>
              ) : (
                <ul className="space-y-4">
                  {groupsWithForms.map((group) => (
                    <li
                      key={group.organizationId}
                      className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100/80"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100/80 bg-brand-50/60 px-4 py-3 sm:px-5">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100">
                            <Building2 className="h-4 w-4 text-brand" aria-hidden />
                          </span>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {group.organizationName || "Organização"}
                            </p>
                            <p className="text-xs text-slate-500">
                              {group.forms.length === 1
                                ? "1 formulário ativo"
                                : `${group.forms.length} formulários ativos`}
                            </p>
                          </div>
                        </div>
                      </div>
                      <ul className="divide-y divide-slate-100 p-1 sm:p-2">
                        {group.forms.map((f) => {
                          const pct =
                            f.totalQuestions > 0
                              ? Math.round((f.answeredQuestions / f.totalQuestions) * 100)
                              : 0;
                          return (
                            <li
                              key={`${group.organizationId}-${f.formId}`}
                              className="flex flex-col gap-3 rounded-lg p-3 transition sm:flex-row sm:items-center sm:justify-between sm:p-4"
                            >
                              <div className="min-w-0 flex-1 space-y-2">
                                <p className="font-medium text-slate-900">
                                  {f.formName || "Formulário"}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formStateLabelPt(f.state)} · {f.answeredQuestions}/
                                  {f.totalQuestions} questões
                                  {f.totalQuestions > 0 ? ` · ${pct}%` : ""}
                                </p>
                                {f.complementationRequests > 0 ? (
                                  <p className="text-xs font-medium text-amber-800">
                                    {f.complementationRequests} evidência(s) com complementação
                                    solicitada
                                  </p>
                                ) : null}
                                <div className="h-1.5 w-full max-w-md overflow-hidden rounded-full bg-slate-200/90">
                                  <div
                                    className="h-full rounded-full bg-brand transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <Link
                                href={`/analista/formularios/${f.formId}?orgId=${group.organizationId}`}
                                className={`${formSurface.primaryButton} w-full justify-center sm:w-auto sm:min-w-[8.5rem]`}
                              >
                                Responder
                                <ArrowRight className="h-4 w-4" aria-hidden />
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </section>

        <p
          className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs leading-relaxed text-slate-600"
          role="note"
        >
          Respostas gravadas por aqui permanecem com a sua autoria; o vínculo é sempre com a
          organização selecionada no fluxo de resposta.
        </p>
      </div>
    </div>
  );
}
