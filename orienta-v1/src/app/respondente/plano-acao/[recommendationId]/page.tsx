import { redirect } from "next/navigation";

export default async function RespondentActionWorkspaceIndexRedirect({
  params,
}: {
  params: Promise<{ recommendationId: string }>;
}) {
  const { recommendationId } = await params;
  redirect(`/respondente/plano-acao/${recommendationId}/visao-geral`);
}
