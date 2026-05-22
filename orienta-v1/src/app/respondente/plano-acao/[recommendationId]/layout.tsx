import { getCurrentUser } from "@/lib/auth/current-user";
import { RecommendationDetailRoot } from "@/components/recommendations-hub/recommendation-detail-root";
import { formSurface } from "@/lib/form-surface";

export default async function RespondentRecommendationOperationalLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  const user = await getCurrentUser();
  if (!user?.organizationId) {
    return (
      <div className={formSurface.messageWarning}>
        Sua conta não está vinculada a uma organização. Entre em contato com o administrador.
      </div>
    );
  }

  return (
    <RecommendationDetailRoot
      recommendationId={recommendationId}
      role="respondent"
      listPath="/respondente/portfolio-recomendacoes"
      detailBasePath={`/respondente/plano-acao/${recommendationId}`}
      actionsTabHrefSegment="acoes"
      actionsTabLabel="Ações"
      workspaceSurface="operational"
    >
      {children}
    </RecommendationDetailRoot>
  );
}
