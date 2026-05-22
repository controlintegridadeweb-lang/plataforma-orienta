import { RecommendationDetailRoot } from "@/components/recommendations-hub/recommendation-detail-root";

export default async function AnalistaRecommendationDetailLayout({
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
      listPath="/analista/recomendacoes"
      workspaceSurface="document"
    >
      {children}
    </RecommendationDetailRoot>
  );
}
