/**
 * Titulos e subtitulos do cabeçalho principal por rota (prefixo mais longo vence).
 */
export type PageHeading = { title: string; description?: string };

type RouteHeading = { prefix: string } & PageHeading;

const ADMIN_HEADINGS: RouteHeading[] = [
  {
    prefix: "/admin/biblioteca",
    title: "Biblioteca Geral",
    description: "Catálogo: eixos e seções",
  },
  {
    prefix: "/admin/formularios/novo",
    title: "Novo formulário",
    description: "Crie um formulário e defina o fluxo de publicação.",
  },
  {
    prefix: "/admin/formularios",
    title: "Formulários",
    description: "Lista, versões, perguntas e configuração.",
  },
  {
    prefix: "/admin/responder",
    title: "Responder por organização",
    description:
      "Responda formulários em nome de uma organização. As respostas mantêm a sua autoria para auditoria.",
  },
  {
    prefix: "/admin/evidencias",
    title: "Evidências e Complementações",
    description: "Validação, auditoria e pedidos de complementação das evidências enviadas.",
  },
  {
    prefix: "/admin/perfil",
    title: "Meu Perfil",
    description: "Atualize seus dados pessoais, visualize vínculos da conta e altere sua senha de acesso.",
  },
  {
    prefix: "/admin/recomendacoes",
    title: "Recomendações",
    description:
      "Portfólio estratégico FAMI: status, priorização e vínculo com planos. Execução no Plano de Ação.",
  },
  {
    prefix: "/admin/plano-acao",
    title: "Plano de Ação",
    description:
      "Execução operacional: ações, prazos, responsáveis e progresso. Monitoramento na aba de cada plano.",
  },
  {
    prefix: "/admin/maturidade",
    title: "Maturidade FAMI",
    description: "Indicadores consolidados e evolução por formulário e organização.",
  },
  {
    prefix: "/admin/usuarios",
    title: "Usuários",
    description: "Perfis, organizações e acessos.",
  },
  {
    prefix: "/admin/relatorios",
    title: "Relatórios",
    description: "Exportações e visões executivas para todas as organizações.",
  },
  {
    prefix: "/admin",
    title: "Dashboard",
    description: "Visão geral do sistema de avaliação de maturidade em integridade.",
  },
];

const ANALYST_HEADINGS: RouteHeading[] = [
  {
    prefix: "/analista/biblioteca",
    title: "Biblioteca Geral",
    description: "Catálogo: eixos e seções",
  },
  {
    prefix: "/analista/formularios/novo",
    title: "Novo formulário",
    description: "Crie um formulário e defina o fluxo de publicação.",
  },
  {
    prefix: "/analista/formularios",
    title: "Formulários",
    description: "Lista, versões, perguntas e configuração.",
  },
  {
    prefix: "/analista/evidencias",
    title: "Evidências e Complementações",
    description: "Validação, auditoria e pedidos de complementação das evidências enviadas.",
  },
  {
    prefix: "/analista/perfil",
    title: "Meu Perfil",
    description: "Atualize seus dados pessoais, visualize vínculos da conta e altere sua senha de acesso.",
  },
  {
    prefix: "/analista/recomendacoes",
    title: "Recomendações",
    description:
      "Portfólio estratégico FAMI: status e priorização. Execução no Plano de Ação.",
  },
  {
    prefix: "/analista/plano-acao",
    title: "Plano de Ação",
    description:
      "Execução operacional e progresso das ações. Monitoramento na aba de cada plano.",
  },
  {
    prefix: "/analista/maturidade",
    title: "Maturidade FAMI",
    description: "Indicadores e evolução no seu escopo.",
  },
  {
    prefix: "/analista/relatorios",
    title: "Relatórios",
    description: "Exportações e visões para a sua organização.",
  },
  {
    prefix: "/analista",
    title: "Dashboard do analista",
    description: "Acompanhamento de validações, recomendações e maturidade FAMI.",
  },
];

const RESPONDENT_HEADINGS: RouteHeading[] = [
  {
    prefix: "/respondente/formularios",
    title: "Meus Formulários",
    description: "Responder questões e acompanhar o progresso do envio.",
  },
  {
    prefix: "/respondente/evidencias-complementacoes",
    title: "Evidências e Complementações",
    description: "Evidências enviadas e pedidos de complementação do analista.",
  },
  {
    prefix: "/respondente/portfolio-recomendacoes",
    title: "Recomendações",
    description:
      "Recomendações geradas pelos formulários: status, próximo passo e cadastro de ações por item.",
  },
  {
    prefix: "/respondente/plano-acao",
    title: "Plano de Ação",
    description:
      "Workspace operacional: visão agregada ou detalhamento por recomendação (ações, prazos e monitoramento).",
  },
  {
    prefix: "/respondente/relatorios",
    title: "Relatórios",
    description: "Relatórios liberados para a sua organização.",
  },
  {
    prefix: "/respondente/pontuacao-fami",
    title: "Pontuação FAMI",
    description: "Indicadores de maturidade da sua organização.",
  },
  {
    prefix: "/respondente/perfil",
    title: "Meu Perfil",
    description: "Atualize seus dados pessoais, visualize vínculos da conta e altere sua senha de acesso.",
  },
  {
    prefix: "/respondente",
    title: "Área do respondente",
    description: "Formulários, evidências, recomendações, plano de ação e pontuação FAMI.",
  },
];

function pickHeading(pathname: string, rows: RouteHeading[]): PageHeading | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  const sorted = [...rows].sort((a, b) => b.prefix.length - a.prefix.length);
  for (const row of sorted) {
    const p = row.prefix.replace(/\/$/, "") || "/";
    if (normalized === p || normalized.startsWith(`${p}/`)) {
      return { title: row.title, description: row.description };
    }
  }
  return null;
}

export function getPageHeadingForPath(pathname: string): PageHeading {
  const path = pathname.split("?")[0] ?? pathname;
  if (path.startsWith("/admin")) {
    return pickHeading(path, ADMIN_HEADINGS) ?? {
      title: "Administração",
      description: "Gestão da plataforma Orienta.",
    };
  }
  if (path.startsWith("/analista")) {
    return pickHeading(path, ANALYST_HEADINGS) ?? {
      title: "Analista",
      description: "Area de analise e validacao.",
    };
  }
  if (path.startsWith("/respondente")) {
    return pickHeading(path, RESPONDENT_HEADINGS) ?? {
      title: "Respondente",
      description: "Area de respostas e acompanhamento.",
    };
  }
  return { title: "Plataforma Orienta", description: undefined };
}
