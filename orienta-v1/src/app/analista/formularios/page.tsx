import Link from "next/link";
import { ArrowRight, Building2, ClipboardList, Inbox, MessageSquare, Plus } from "lucide-react";
import { formsByOrganizationGlobal } from "@/lib/dashboards/queries";
import { formStateLabelPt } from "@/lib/respondent/form-labels";
import { PageCardShell } from "@/components/ui/page-card-shell";
import { PanelSection } from "@/components/ui/panel-section";
import { ProfileContentLayout } from "@/components/profile/profile-content-layout";
import { FormsList } from "@/components/formulario/forms-list";
import { formSurface } from "@/lib/form-surface";
import { layout } from "@/lib/design-system";

export default async function AnalistaFormulariosPage() {
  const groups = await formsByOrganizationGlobal();
  const groupsWithForms = groups.filter((g) => g.forms.length > 0);

  return (
    <div className={layout.pageStack}>
      <PageCardShell
        title="Formulários"
        description="Crie e edite modelos, ou responda em nome das organizações. Tudo no mesmo lugar."
        illustration
        actions={
          <Link href="/analista/formularios/novo" className={formSurface.primaryButtonSm}>
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Novo formulário
          </Link>
        }
      >
        <ProfileContentLayout width="wide">
          <PanelSection
            title="Modelos cadastrados"
            description="Rascunhos, perguntas, vínculos e publicação — exceto exclusão definitiva."
            icon={ClipboardList}
            variant="card"
          >
            <FormsList formBasePath="/analista/formularios" showDelete={false} />
          </PanelSection>
        </ProfileContentLayout>
      </PageCardShell>

      <PageCardShell
        title="Formulários para responder"
        description="Escolha a organização e o formulário: as respostas ficam vinculadas a ela, com a sua autoria de analista."
        illustration
      >
        <ProfileContentLayout width="wide">
          <PanelSection
            title="Organizações com formulários ativos"
            description="Respostas gravadas por aqui permanecem com a sua autoria."
            icon={Building2}
            variant="card"
          >
            {groupsWithForms.length === 0 ? (
              <div className={formSurface.empty.container}>
                <span className={formSurface.empty.iconWrap}>
                  <Inbox className="h-5 w-5" aria-hidden />
                </span>
                <p className={formSurface.empty.title}>Nenhum formulário disponível para resposta</p>
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
                              <p className="font-medium text-slate-900">{f.formName || "Formulário"}</p>
                              <p className="text-xs text-slate-500">
                                {formStateLabelPt(f.state)} · {f.answeredQuestions}/{f.totalQuestions} questões
                                {f.totalQuestions > 0 ? ` · ${pct}%` : ""}
                              </p>
                              {f.complementationRequests > 0 ? (
                                <p className="text-xs font-medium text-amber-800">
                                  {f.complementationRequests} evidência(s) com complementação solicitada
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
          </PanelSection>
        </ProfileContentLayout>
      </PageCardShell>

      <p
        className="mx-auto flex max-w-4xl items-start gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 text-xs leading-relaxed text-slate-600"
        role="note"
      >
        <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
        <span>
          Respostas gravadas por aqui permanecem com a sua autoria; o vínculo é sempre com a organização selecionada
          no fluxo de resposta.
        </span>
      </p>
    </div>
  );
}
