/**
 * Titulos e subtitulos do cabeçalho principal por rota (prefixo mais longo vence).
 */
import { evidenceComplementation } from "@/lib/labels/complementation-terms";

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
    description:
      "Lista, versões, perguntas, configuração e ciclo institucional (inclui complementação do ciclo, se aplicável).",
  },
  {
    prefix: "/admin/evidencias",
    title: "Evidências e Complementações",
    description: evidenceComplementation.navDescription,
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

const RESPONDENT_HEADINGS: RouteHeading[] = [
  {
    prefix: "/respondente/formularios",
    title: "Meus Formulários",
    description:
      "Responder questões, anexar evidências e finalizar o envio da sua organização quando concluir.",
  },
  {
    prefix: "/respondente/evidencias-complementacoes",
    title: "Evidências e Complementações",
    description: `${evidenceComplementation.navDescription} Distinto da complementação do ciclo do formulário (configuração admin).`,
  },
  {
    prefix: "/respondente/portfolio-recomendacoes",
    title: "Recomendações e plano",
    description:
      "Lista de recomendações da sua organização: status, prioridade e acesso ao cadastro de ações de cada item.",
  },
  {
    prefix: "/respondente/plano-acao",
    title: "Recomendações e plano",
    description:
      "Detalhe da recomendação: visão geral, ações, prazos, responsáveis e monitoramento.",
  },
  {
    prefix: "/respondente/relatorios",
    title: "Relatórios",
    description: "Relatórios liberados para a sua organização.",
  },
  {
    prefix: "/respondente/pontuacao-fami",
    title: "Pontuação FAMI",
    description:
      "Indicadores oficiais de maturidade. A pontuação consolidada é calculada quando a administração encerra o ciclo do formulário; até lá, respostas e evidências atualizam recomendações.",
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
  if (path.startsWith("/respondente")) {
    return pickHeading(path, RESPONDENT_HEADINGS) ?? {
      title: "Respondente",
      description: "Area de respostas e acompanhamento.",
    };
  }
  return { title: "Plataforma Orienta", description: undefined };
}
