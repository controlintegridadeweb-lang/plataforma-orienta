"use client";

import {
  FileSearch,
  FolderOpen,
  Inbox,
  SearchX,
} from "lucide-react";
import { formSurface } from "@/lib/form-surface";

type Variant =
  | "no-reports"
  | "no-processing"
  | "no-exports"
  | "no-filter-results";

const CFG: Record<
  Variant,
  { icon: typeof Inbox; title: string; body: string; iconBg: string; iconColor: string }
> = {
  "no-reports": {
    icon: Inbox,
    title: "Nenhum relatório no histórico",
    body: "Gere um PDF oficial na central de exportação. Os registros aparecerão aqui após cada geração bem-sucedida.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
  "no-processing": {
    icon: FolderOpen,
    title: "Nenhum processamento disponível",
    body: "É necessário ter FAMI processado para o formulário selecionado. Use a Pontuação FAMI ou solicite reprocessamento ao analista.",
    iconBg: "bg-amber-50",
    iconColor: "text-amber-700",
  },
  "no-exports": {
    icon: FileSearch,
    title: "Nenhuma exportação recente",
    body: "As exportações dos últimos 7 dias aparecem nos indicadores acima. Gere um novo relatório para atualizar o painel.",
    iconBg: "bg-sky-50",
    iconColor: "text-sky-700",
  },
  "no-filter-results": {
    icon: SearchX,
    title: "Nenhum resultado encontrado",
    body: "Ajuste a busca, o tipo de relatório ou o período para ampliar os resultados.",
    iconBg: "bg-slate-100",
    iconColor: "text-slate-500",
  },
};

export function RespondentReportsEmptyState({ variant }: { variant: Variant }) {
  const cfg = CFG[variant];
  const Icon = cfg.icon;
  return (
    <div className={formSurface.empty.container}>
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.iconBg}`}
      >
        <Icon className={`h-6 w-6 ${cfg.iconColor}`} aria-hidden />
      </span>
      <p className={formSurface.empty.title}>{cfg.title}</p>
      <p className={formSurface.empty.description}>{cfg.body}</p>
    </div>
  );
}
