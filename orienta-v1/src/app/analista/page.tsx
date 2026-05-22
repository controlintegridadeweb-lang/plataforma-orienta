import Link from "next/link";
import { ArrowRight, FileCheck, Lightbulb } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  analystPendencies,
  analystRecentRecommendations,
  countPendingEvidences,
  countRecommendations,
  maturityByAxis,
} from "@/lib/dashboards/queries";
import { AxisBarChart } from "@/components/charts/axis-bar-chart";
import { KpiCard } from "@/components/ui/kpi-card";
import { PendenciesList } from "@/components/dashboard/pendencies-list";
import { SectionHeader } from "@/components/ui/section-header";
import { formSurface } from "@/lib/form-surface";
import { layout, typography } from "@/lib/design-system";

export default async function AnalistaDashboardPage() {
  const user = await getCurrentUser();
  const organizationId = user?.organizationId ?? "";

  const [pendingEvidences, recommendationsCount, axes, pendencies, recentRecs] = await Promise.all([
    organizationId ? countPendingEvidences(organizationId) : Promise.resolve(0),
    organizationId ? countRecommendations(organizationId) : Promise.resolve(0),
    organizationId ? maturityByAxis(organizationId) : Promise.resolve([]),
    organizationId ? analystPendencies(organizationId) : Promise.resolve([]),
    organizationId ? analystRecentRecommendations(organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className={layout.pageStack}>
      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Resumo</p>
        <div className={layout.kpiGrid3}>
        <KpiCard
          label="Evidencias para validar"
          value={pendingEvidences}
          icon={FileCheck}
          tone="amber"
          hint="Ir para validacao de respostas"
          href="/analista/evidencias"
        />
        <KpiCard
          label="Recomendacoes geradas"
          value={recommendationsCount}
          icon={Lightbulb}
          tone="blue"
          hint="Abrir lista de recomendacoes"
          href="/analista/recomendacoes"
        />
        </div>
      </section>

      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Indicadores</p>
        <div className={layout.twoPanelGrid}>
        <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}>
          <SectionHeader title="Maturidade por Eixo" description="Percentual mais recente por eixo (FAMI)" />
          <div className="h-64">
            <AxisBarChart data={axes} />
          </div>
        </div>
        <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}>
          <SectionHeader
            title="Evidencias pendentes"
            description="Aguardando validacao"
            actions={
              <Link
                href="/analista/evidencias"
                className={typography.inlineNavLink}
              >
                Abrir validacoes <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            }
          />
          <PendenciesList items={pendencies} />
        </div>
        </div>
      </section>

      <section className={layout.sectionStack}>
        <p className={typography.sectionLabel}>Acompanhamento</p>
        <div className={`${formSurface.dashboardPanel} ${formSurface.dashboardPanelPadding}`}>
        <SectionHeader
          title="Recomendacoes recentes"
          description="Ultimas recomendacoes geradas para sua organizacao"
          actions={
            <Link
              href="/analista/recomendacoes"
              className={typography.inlineNavLink}
            >
              Ver recomendacoes <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          }
        />
        {recentRecs.length === 0 ? (
          <div className={formSurface.empty.container}>
            <p className={formSurface.empty.description}>Sem recomendações recentes.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-200">
            {recentRecs.map((rec) => (
              <li key={rec.id} className="py-3">
                <p className="text-sm text-slate-800">{rec.text}</p>
                {rec.createdAt ? (
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(rec.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        </div>
      </section>
    </div>
  );
}
