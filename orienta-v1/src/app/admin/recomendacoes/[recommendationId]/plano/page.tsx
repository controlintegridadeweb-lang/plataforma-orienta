import { redirect } from "next/navigation";

export default async function AdminRecommendationPlanoRedirect({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/admin/plano-acao/${recommendationId}/visao-geral`);
}
