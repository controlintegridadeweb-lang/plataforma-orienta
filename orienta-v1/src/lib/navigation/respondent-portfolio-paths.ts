/** Lista estratégica do respondente (sem workspace operacional). */

export const RESPONDENT_PORTFOLIO_LIST_PATH = "/respondente/portfolio-recomendacoes";

/** Workspace operacional (abas Visão geral, Ações, Monitoramento). */
export const RESPONDENT_ACTION_WORKSPACE_BASE = "/respondente/plano-acao";

export type RespondentActionWorkspaceTab = "visao-geral" | "acoes" | "monitoramento";

export function respondentActionWorkspacePath(
  recommendationId: string,
  tab: RespondentActionWorkspaceTab = "acoes",
): string {
  return `${RESPONDENT_ACTION_WORKSPACE_BASE}/${recommendationId}/${tab}`;
}
