import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  ClipboardList,
  FileBarChart,
  FileCheck,
  Gauge,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  User,
  Users,
} from "lucide-react";
import type { AppRole } from "@/lib/auth/current-user";

export type NavGroup = "principal" | "gestao" | "analise" | "sistema";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  group: NavGroup;
};

export const navGroupLabels: Record<NavGroup, string> = {
  principal: "",
  gestao: "Gestão",
  analise: "Análise",
  sistema: "Sistema",
};

export const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  analyst: "Analista",
  respondent: "Respondente",
};

export const navigationByRole: Record<AppRole, NavItem[]> = {
  admin: [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, group: "principal" },
    { href: "/admin/biblioteca", label: "Biblioteca Geral", icon: BookOpen, group: "gestao" },
    { href: "/admin/formularios", label: "Formulários", icon: ClipboardList, group: "gestao" },
    {
      href: "/admin/evidencias",
      label: "Evidências e Complementações",
      icon: FileCheck,
      group: "gestao",
    },
    { href: "/admin/recomendacoes", label: "Recomendações", icon: Lightbulb, group: "analise" },
    { href: "/admin/plano-acao", label: "Plano de Ação", icon: ListChecks, group: "analise" },
    { href: "/admin/maturidade", label: "Maturidade FAMI", icon: Gauge, group: "analise" },
    { href: "/admin/relatorios", label: "Relatórios", icon: FileBarChart, group: "analise" },
    { href: "/admin/usuarios", label: "Usuários", icon: Users, group: "sistema" },
    { href: "/admin/perfil", label: "Meu Perfil", icon: User, group: "sistema" },
  ],
  analyst: [
    { href: "/analista", label: "Dashboard", icon: LayoutDashboard, group: "principal" },
    { href: "/analista/biblioteca", label: "Biblioteca Geral", icon: BookOpen, group: "gestao" },
    { href: "/analista/formularios", label: "Formulários", icon: ClipboardList, group: "gestao" },
    {
      href: "/analista/evidencias",
      label: "Evidências e Complementações",
      icon: FileCheck,
      group: "gestao",
    },
    { href: "/analista/recomendacoes", label: "Recomendações", icon: Lightbulb, group: "analise" },
    { href: "/analista/plano-acao", label: "Plano de Ação", icon: ListChecks, group: "analise" },
    { href: "/analista/maturidade", label: "Maturidade FAMI", icon: Gauge, group: "analise" },
    { href: "/analista/relatorios", label: "Relatórios", icon: FileBarChart, group: "analise" },
    { href: "/analista/perfil", label: "Meu Perfil", icon: User, group: "sistema" },
  ],
  respondent: [
    { href: "/respondente", label: "Dashboard", icon: LayoutDashboard, group: "principal" },
    { href: "/respondente/formularios", label: "Meus Formulários", icon: ClipboardList, group: "principal" },
    {
      href: "/respondente/evidencias-complementacoes",
      label: "Evidências e Complementações",
      icon: FileCheck,
      group: "principal",
    },
    {
      href: "/respondente/portfolio-recomendacoes",
      label: "Recomendações",
      icon: Lightbulb,
      group: "principal",
    },
    { href: "/respondente/pontuacao-fami", label: "Pontuação FAMI", icon: Gauge, group: "principal" },
    { href: "/respondente/relatorios", label: "Relatórios", icon: FileBarChart, group: "principal" },
    { href: "/respondente/perfil", label: "Meu Perfil", icon: User, group: "sistema" },
  ],
};
