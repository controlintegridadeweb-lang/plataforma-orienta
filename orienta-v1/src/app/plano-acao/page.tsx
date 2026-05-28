import { assertDevPageOrRedirect } from "@/lib/dev/dev-only-page";
import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";
import PlanoAcaoSandboxClient from "./plano-acao-sandbox.client";

export default function PlanoAcaoSandboxPage() {
  assertDevPageOrRedirect(RESPONDENT_PORTFOLIO_LIST_PATH);
  return <PlanoAcaoSandboxClient />;
}
