import { redirect } from "next/navigation";

export default async function AdminRecommendationMonitoramentoRedirect({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/admin/plano-acao/${recommendationId}/monitoramento`);
}
