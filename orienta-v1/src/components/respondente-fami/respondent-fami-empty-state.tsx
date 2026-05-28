"use client";

import { CheckCircle2, Inbox, Sparkles } from "lucide-react";
import { formSurface } from "@/lib/layout/form-surface";

type Kind = "no-snapshot" | "no-form" | "no-history" | "no-data";

const CONFIG: Record<
  Kind,
  {
    icon: typeof Inbox;
    title: string;
    description: string;
    iconBg: string;
    iconColor: string;
  }
> = {
  "no-snapshot": {
    icon: Sparkles,
    title: "Sua maturidade ainda não foi calculada",
    description:
      "A pontuação FAMI oficial é gerada quando a administração encerra o ciclo do formulário. Até lá, continue respondendo e acompanhe as recomendações geradas pelas suas respostas.",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
  },
  "no-form": {
    icon: Inbox,
    title: "Selecione um formulário",
    description: "Escolha um formulário acima para carregar sua maturidade institucional.",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
  },
  "no-history": {
    icon: CheckCircle2,
    title: "Sem histórico de evolução",
    description:
      "Após o segundo processamento será possível comparar a evolução da sua maturidade.",
    iconBg: "bg-emerald-50",
    iconColor: "text-emerald-700",
  },
  "no-data": {
    icon: Inbox,
    title: "Dados insuficientes para análise",
    description:
      "Adicione respostas e evidências para que o FAMI possa gerar uma leitura completa da sua maturidade.",
    iconBg: "bg-slate-50",
    iconColor: "text-slate-500",
  },
};

type Props = {
  kind: Kind;
  /** Filtragem anual ativa mas sem dados de fechamento daquele ano (BRT) */
  yearFiltered?: number | null;
};

export function RespondentFamiEmptyState({ kind, yearFiltered }: Props) {
  const cfg = CONFIG[kind];
  const Icon = cfg.icon;
  const useYearFiltered =
    kind === "no-snapshot" && yearFiltered != null && Number.isFinite(yearFiltered);
  const title = useYearFiltered
    ? `Nenhum processamento FAMI em ${yearFiltered}`
    : cfg.title;
  const description = useYearFiltered
    ? "Experimente “Todos os anos” ou outro exercício disponível para ver o último fechamento disponível."
    : cfg.description;
  return (
    <section className={formSurface.empty.container}>
      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.iconBg}`}>
        <Icon className={`h-6 w-6 ${cfg.iconColor}`} aria-hidden />
      </span>
      <p className={formSurface.empty.title}>{title}</p>
      <p className={formSurface.empty.description}>{description}</p>
    </section>
  );
}
