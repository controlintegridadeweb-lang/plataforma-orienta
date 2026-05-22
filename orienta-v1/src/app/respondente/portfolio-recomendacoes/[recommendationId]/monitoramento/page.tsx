import { redirect } from "next/navigation";

export default async function PortfolioRecommendationMonitoringLegacyRedirect({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/respondente/plano-acao/${recommendationId}/monitoramento`);
}
