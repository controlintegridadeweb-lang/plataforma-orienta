import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/current-user";
import { isGlobalAdmin } from "@/lib/auth/scope";
import { AdminDashboardDeferred } from "@/components/dashboard/admin-dashboard-deferred";
import { AdminDashboardKpisSection } from "@/components/dashboard/admin-dashboard-kpis-section";
import { AdminDashboardHero } from "@/components/dashboard/admin-dashboard-hero";
import { KpiGridSkeleton } from "@/components/dashboard/dashboard-section-skeleton";
import { ADMIN_PAGE_HERO_BLEED } from "@/lib/admin-page-layout";
import { layout } from "@/lib/design-system";

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();
  const organizationId = user?.organizationId ?? "";
  const adminGlobalView = !!user && isGlobalAdmin(user);
  const scope = { adminGlobalView, organizationId };

  return (
    <div className={layout.pageStack}>
      <div className={ADMIN_PAGE_HERO_BLEED}>
        <AdminDashboardHero />
      </div>

      <div className={`${layout.pageStack} pt-1`}>
        <Suspense fallback={<KpiGridSkeleton />}>
          <AdminDashboardKpisSection scope={scope} />
        </Suspense>

        <AdminDashboardDeferred scope={scope} />
      </div>
    </div>
  );
}
