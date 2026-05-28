import { assertDevPageOrRedirect } from "@/lib/dev/dev-only-page";
import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";
import PortfolioRecomendacoesSandboxClient from "./portfolio-sandbox.client";

export default function PortfolioRecomendacoesSandboxPage() {
  assertDevPageOrRedirect(RESPONDENT_PORTFOLIO_LIST_PATH);
  return <PortfolioRecomendacoesSandboxClient />;
}
