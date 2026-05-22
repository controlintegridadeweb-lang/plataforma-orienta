import { ClipboardList, FileBarChart, FileCheck, Lightbulb, ListChecks, Users } from "lucide-react";
import { adminQueueHref } from "@/lib/admin/queue-links";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isGlobalAdmin } from "@/lib/auth/scope";
import {
  adminPendencies,
  adminPendenciesGlobal,
  countActionPlansByStatus,
  countActionPlansByStatusGlobal,
  countActiveForms,
  countPendingEvidences,
  countPendingEvidencesGlobal,
  countRecommendations,
  countRecommendationsGlobal,
  countProfiles,
  countReportsGenerated,
  evidenceStatusBreakdown,
  evidenceStatusBreakdownGlobal,
  maturityByAxis,
  maturityByAxisGlobal,
  recentActivities,
} from "@/lib/dashboards/queries";
import { AdminDashboardHero } from "@/components/dashboard/admin-dashboard-hero";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardEvidenceStatusPanel } from "@/components/dashboard/dashboard-evidence-status-panel";
import { DashboardMaturityByAxisPanel } from "@/components/dashboard/dashboard-maturity-by-axis-panel";
import { KpiCard } from "@/components/ui/kpi-card";
import { PendenciesList } from "@/components/dashboard/pendencies-list";
import { SectionHeader } from "@/components/ui/section-header";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const organizationId = user?.organizationId ?? "";
  /** Admin sem org no perfil: visao consolidada de todo o sistema (nao fica tudo em zero). */
  const adminGlobalView = !!user && isGlobalAdmin(user);

  const [
    activeForms,
    pendingEvidences,
    recommendationsCount,
    planStatus,
    axes,
    evidenceStatus,
    activities,
    pendencies,
    profilesCount,
    reportsCount,
  ] = await Promise.all([
    countActiveForms(),
    adminGlobalView
      ? countPendingEvidencesGlobal()
      : organizationId
        ? countPendingEvidences(organizationId)
        : Promise.resolve(0),
    adminGlobalView
      ? countRecommendationsGlobal()
      : organizationId
        ? countRecommendations(organizationId)
        : Promise.resolve(0),
    adminGlobalView
      ? countActionPlansByStatusGlobal()
      : organizationId
        ? countActionPlansByStatus(organizationId)
        : Promise.resolve({} as Record<string, number>),
    adminGlobalView
      ? maturityByAxisGlobal()
      : organizationId
        ? maturityByAxis(organizationId)
        : Promise.resolve([]),
    adminGlobalView
      ? evidenceStatusBreakdownGlobal()
      : organizationId
        ? evidenceStatusBreakdown(organizationId)
        : Promise.resolve({}),
    recentActivities(8),
    adminGlobalView
      ? adminPendenciesGlobal()
      : organizationId
        ? adminPendencies(organizationId)
        : Promise.resolve([]),
    countProfiles(),
    countReportsGenerated(),
  ]);

  const plansInProgress = planStatus.in_progress ?? 0;
  const pendenciesCount = pendencies.length;

  const queueOpts = { adminGlobalView, organizationId };
  const hrefForms = adminQueueHref("/admin/formularios", queueOpts, {});
  const hrefEvidenciasPending = adminQueueHref("/admin/evidencias", queueOpts, {
    status: "pending",
  });
  const hrefRecomendacoes = adminQueueHref("/admin/recomendacoes", queueOpts, {});
  const hrefPlanosEmAndamento = adminQueueHref("/admin/plano-acao", queueOpts, {});

  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminDashboardHero
          activeForms={activeForms}
          openRecommendations={recommendationsCount}
          plansInProgress={plansInProgress}
        />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Visão geral</p>
        <div className={layout.kpiGrid4}>
          <KpiCard
            label="Formulários ativos"
            value={activeForms}
            icon={ClipboardList}
            tone="emerald"
            hint={activeForms === 0 ? "Nenhum formulário publicado" : undefined}
            title="Formulários publicados e em uso (exclui rascunhos, encerrados e arquivados)."
            href={hrefForms}
            ctaLabel="Abrir formulários"
          />
          <KpiCard
            label="Evidências pendentes"
            value={pendingEvidences}
            icon={FileCheck}
            tone="amber"
            hint={
              pendingEvidences === 0
                ? undefined
                : `${pendingEvidences} ${pendingEvidences === 1 ? "precisa" : "precisam"} de revisão`
            }
            title={pendingEvidences === 0 ? "Nada aguardando análise." : undefined}
            href={hrefEvidenciasPending}
            ctaLabel="Ver fila de evidências"
          />
          <KpiCard
            label="Recomendações"
            value={recommendationsCount}
            icon={Lightbulb}
            tone="blue"
            hint={recommendationsCount === 0 ? undefined : "Geradas pela análise FAMI"}
            title={recommendationsCount === 0 ? "Ainda não há recomendações." : undefined}
            href={hrefRecomendacoes}
            ctaLabel="Ver recomendações"
          />
          <KpiCard
            label="Planos em andamento"
            value={plansInProgress}
            icon={ListChecks}
            tone="slate"
            hint={plansInProgress === 0 ? undefined : "Em execução"}
            title={plansInProgress === 0 ? "Crie planos a partir de recomendações." : undefined}
            href={hrefPlanosEmAndamento}
            ctaLabel="Ver planos em andamento"
          />
        </div>
      </section>

      {/* Sistema */}
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Sistema</p>
        <div className={layout.kpiGrid2}>
          <KpiCard
            label="Usuários cadastrados"
            value={profilesCount}
            icon={Users}
            tone="emerald"
            hint={profilesCount === 0 ? undefined : "Com acesso à plataforma"}
            title="Total de perfis na tabela de usuários."
            href="/admin/usuarios"
            ctaLabel="Gerenciar usuários"
          />
          <KpiCard
            label="Relatórios gerados"
            value={reportsCount}
            icon={FileBarChart}
            tone="blue"
            hint={
              reportsCount === 0
                ? "Gere relatórios oficiais na área de relatórios."
                : "PDF oficial já registrados."
            }
            title="Registros na tabela de relatórios."
            href="/admin/relatorios"
            ctaLabel="Abrir relatórios"
          />
        </div>
      </section>

      {/* Pendencias prioritarias */}
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Ações prioritárias</p>
        <div
          className={`${formSurface.dashboardPanel} ${pendenciesCount > 0 ? formSurface.dashboardPanelPadding : "px-6 py-5 md:px-7 md:py-6"}`}
        >
          <SectionHeader
            kicker={pendenciesCount > 0 ? "Requer atenção" : undefined}
            title="Pendências"
            description={pendenciesCount > 0 ? "Decisões ou encaminhamentos pendentes" : undefined}
            actions={
              pendenciesCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200 sm:text-sm">
                  {pendenciesCount} em aberto
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-200 sm:text-sm">
                  Tudo em dia
                </span>
              )
            }
          />
          <PendenciesList items={pendencies} />
        </div>
      </section>

      {/* Analise: maturidade + status */}
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Análise de maturidade</p>
        <div className={layout.maturityAndEvidenceGrid}>
          <div className="xl:col-span-3">
            <DashboardMaturityByAxisPanel
              initialAxes={axes}
              initialOrganizationId={adminGlobalView ? "" : organizationId}
            />
          </div>
          <div className="xl:col-span-2">
            <DashboardEvidenceStatusPanel
              initialData={evidenceStatus}
              initialOrganizationId={adminGlobalView ? "" : organizationId}
            />
          </div>
        </div>
      </section>

      {/* Acompanhamento operacional */}
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Acompanhamento</p>
        <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}>
          <SectionHeader
            kicker="Auditoria"
            title="Atividades recentes"
            description="Eventos recentes no sistema"
          />
          <ActivityFeed activities={activities} />
        </div>
      </section>
      </div>
    </div>
  );
}
