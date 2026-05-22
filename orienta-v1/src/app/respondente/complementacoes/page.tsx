import { redirect } from "next/navigation";

/** Rota legada → canônica com filtro de complementação. */
export default function RespondenteComplementacoesRedirect() {
  redirect("/respondente/evidencias-complementacoes");
}
