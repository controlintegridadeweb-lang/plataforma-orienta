import { redirect } from "next/navigation";
import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";

/**
 * Lista operacional unificada no portfólio de recomendações.
 * Workspace de detalhe permanece em /respondente/plano-acao/[recommendationId].
 */
export default function RespondentePlanoAcaoRedirectPage() {
  redirect(RESPONDENT_PORTFOLIO_LIST_PATH);
}
