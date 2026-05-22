import { redirect } from "next/navigation";

export default async function AnalistaPlanoAcaoDetailPage({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/analista/plano-acao/${recommendationId}/visao-geral`);
}
