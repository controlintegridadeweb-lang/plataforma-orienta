export type WorkspaceTabKey = "overview" | "actions" | "monitoring";

export type WorkspaceTabMeta = {
  key: WorkspaceTabKey;
  label: string;
  tagline: string;
  description: string;
};

export const WORKSPACE_TABS: WorkspaceTabMeta[] = [
  {
    key: "overview",
    label: "Visão geral",
    tagline: "Estratégia",
    description:
      "Contexto institucional da recomendação — pergunta, texto oficial, eixo e impacto FAMI.",
  },
  {
    key: "actions",
    label: "Ações",
    tagline: "Execução",
    description:
      "Workspace operacional — cadastre tarefas, prazos, responsáveis e acompanhe o progresso.",
  },
  {
    key: "monitoring",
    label: "Monitoramento",
    tagline: "Supervisão",
    description:
      "Linha do tempo e registro institucional — alterações, validações e histórico cronológico.",
  },
];

export function workspaceTabFromPathname(pathname: string): WorkspaceTabKey {
  if (pathname.endsWith("/monitoramento")) return "monitoring";
  if (pathname.endsWith("/acoes")) return "actions";
  return "overview";
}

export function workspaceTabMeta(pathname: string): WorkspaceTabMeta {
  const key = workspaceTabFromPathname(pathname);
  return WORKSPACE_TABS.find((t) => t.key === key) ?? WORKSPACE_TABS[0];
}

export function workspaceTabsForBasePath(
  basePath: string,
  order: WorkspaceTabKey[],
  options?: { actionsHrefSegment?: string; actionsLabel?: string },
): { href: string; label: string; tagline: string }[] {
  const actionsSegment = options?.actionsHrefSegment ?? "acoes";
  const actionsLabel = options?.actionsLabel ?? "Ações";
  return order.map((key) => {
    const meta = WORKSPACE_TABS.find((t) => t.key === key)!;
    const segment =
      key === "overview" ? "visao-geral" : key === "actions" ? actionsSegment : "monitoramento";
    return {
      href: `${basePath}/${segment}`,
      label: key === "actions" ? actionsLabel : meta.label,
      tagline: meta.tagline,
    };
  });
}
