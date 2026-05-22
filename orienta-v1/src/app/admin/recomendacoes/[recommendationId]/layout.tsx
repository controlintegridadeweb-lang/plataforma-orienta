import { RecommendationDetailRoot } from "@/components/recommendations-hub/recommendation-detail-root";

export default async function AdminRecommendationDetailLayout({
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
      listPath="/admin/recomendacoes"
      workspaceSurface="document"
    >
      {children}
    </RecommendationDetailRoot>
  );
}
