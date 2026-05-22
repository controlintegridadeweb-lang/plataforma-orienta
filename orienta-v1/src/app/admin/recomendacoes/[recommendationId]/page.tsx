import { redirect } from "next/navigation";

export default async function AdminRecommendationIdRedirectPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/admin/recomendacoes/${recommendationId}/visao-geral`);
}
