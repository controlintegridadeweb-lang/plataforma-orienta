import { redirect } from "next/navigation";

export default async function AnalistaRecommendationMonitoramentoRedirect({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/analista/plano-acao/${recommendationId}/monitoramento`);
}
