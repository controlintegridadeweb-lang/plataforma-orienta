import { ClipboardList, FileBarChart, FileCheck, Lightbulb, ListChecks, Users } from "lucide-react";
import { adminQueueHref } from "@/lib/admin/queue-links";
import {
  countActionPlansByStatus,
  countActionPlansByStatusGlobal,
  countActiveForms,
  countPendingEvidences,
  countPendingEvidencesGlobal,
  countRecommendations,
  countRecommendationsGlobal,
  countProfiles,
  countReportsGenerated,
} from "@/lib/dashboards/queries";
import { KpiCard } from "@/components/ui/kpi-card";
import { layout, typography } from "@/lib/layout/design-system";

export type AdminDashboardScope = {
  adminGlobalView: boolean;
  organizationId: string;
};

export async function AdminDashboardKpisSection({ scope }: { scope: AdminDashboardScope }) {
  const { adminGlobalView, organizationId } = scope;

  const [activeForms, pendingEvidences, recommendationsCount, planStatus, profilesCount, reportsCount] =
    await Promise.all([
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
      countProfiles(),
      countReportsGenerated(),
    ]);

  const plansInProgress = planStatus.in_progress ?? 0;
  const queueOpts = { adminGlobalView, organizationId };
  const hrefForms = adminQueueHref("/admin/formularios", queueOpts, {});
  const hrefEvidenciasPending = adminQueueHref("/admin/evidencias", queueOpts, {
    status: "pending",
  });
  const hrefRecomendacoes = adminQueueHref("/admin/recomendacoes", queueOpts, {});
  const hrefPlanosEmAndamento = adminQueueHref("/admin/plano-acao", queueOpts, {});

  return (
    <>
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
    </>
  );
}
