import { redirect } from "next/navigation";

export default async function AnalistaRecommendationIdRedirectPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/analista/recomendacoes/${recommendationId}/visao-geral`);
}
