import { redirect } from "next/navigation";

/** Rota legada → visão unificada de evidências (sem filtro inicial). */
export default function RespondenteEvidenciasRedirect() {
  redirect("/respondente/evidencias-complementacoes?view=all");
}
