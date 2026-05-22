import { RecommendationDetailRoot } from "@/components/recommendations-hub/recommendation-detail-root";

export default async function AnalistaPlanoAcaoDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  return (
    <RecommendationDetailRoot
      recommendationId={recommendationId}
      role="staff"
      listPath="/analista/plano-acao"
      detailBasePath={`/analista/plano-acao/${recommendationId}`}
      actionsTabHrefSegment="acoes"
      actionsTabLabel="Ações"
      workspaceSurface="supervision"
    >
      {children}
    </RecommendationDetailRoot>
  );
}
