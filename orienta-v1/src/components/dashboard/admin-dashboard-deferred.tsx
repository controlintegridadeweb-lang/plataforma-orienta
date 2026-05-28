import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  adminPendencies,
  adminPendenciesGlobal,
  evidenceStatusBreakdown,
  evidenceStatusBreakdownGlobal,
  maturityByAxis,
  maturityByAxisGlobal,
  recentActivities,
} from "@/lib/dashboards/queries";
import { loadRecommendationFilterOptions } from "@/lib/recommendations/server-filters";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { DashboardDeferredSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { DashboardEvidenceStatusPanel } from "@/components/dashboard/dashboard-evidence-status-panel";
import { DashboardMaturityByAxisPanel } from "@/components/dashboard/dashboard-maturity-by-axis-panel";
import { PendenciesList } from "@/components/dashboard/pendencies-list";
import { SectionHeader } from "@/components/ui/section-header";
import { formSurface } from "@/lib/layout/form-surface";
import { layout, typography } from "@/lib/layout/design-system";

type Scope = {
  adminGlobalView: boolean;
  organizationId: string;
};

async function AdminDashboardDeferredContent({ scope }: { scope: Scope }) {
  const { adminGlobalView, organizationId } = scope;
  const user = await getCurrentUser();
  if (!user) return null;

  const filterOrgId = adminGlobalView ? "" : organizationId;

  const [axes, evidenceStatus, activities, pendencies, filterOptions] = await Promise.all([
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
    loadRecommendationFilterOptions(user),
  ]);

  const pendenciesCount = pendencies.length;

  return (
    <>
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

      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Análise de maturidade</p>
        <div className={layout.maturityAndEvidenceGrid}>
          <div className="xl:col-span-3">
            <DashboardMaturityByAxisPanel
              initialAxes={axes}
              initialOrganizationId={filterOrgId}
              filterOptions={filterOptions}
            />
          </div>
          <div className="xl:col-span-2">
            <DashboardEvidenceStatusPanel
              initialData={evidenceStatus}
              initialOrganizationId={filterOrgId}
              filterOptions={filterOptions}
            />
          </div>
        </div>
      </section>

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
    </>
  );
}

export function AdminDashboardDeferred({ scope }: { scope: Scope }) {
  return (
    <Suspense fallback={<DashboardDeferredSkeleton />}>
      <AdminDashboardDeferredContent scope={scope} />
    </Suspense>
  );
}
