"use client";

import Link from "next/link";
import { CheckCircle2, Filter, Inbox, ListChecks, ShieldCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formSurface } from "@/lib/form-surface";

export type EmptyVariant =
  | "no-actions"
  | "no-overdue"
  | "no-completed"
  | "no-results";

type VariantDef = {
  icon: LucideIcon;
  title: string;
  description: string;
  cta?: { label: string; href?: string; onClick?: () => void };
};

type Props = {
  variant: EmptyVariant;
  onClearFilters?: () => void;
};

export function RespondentActionPlanEmptyState({ variant, onClearFilters }: Props) {
  const defs: Record<EmptyVariant, VariantDef> = {
    "no-actions": {
      icon: ListChecks,
      title: "Nenhuma ação cadastrada ainda",
      description:
        "As ações nascem das recomendações geradas após a análise das suas respostas e evidências. Comece pelas recomendações pendentes.",
      cta: {
        label: "Ir para Portfólio de Recomendações",
        href: "/respondente/portfolio-recomendacoes",
      },
    },
    "no-overdue": {
      icon: ShieldCheck,
      title: "Nenhuma ação atrasada",
      description:
        "Bom trabalho — todas as ações estão dentro do prazo. Continue acompanhando as próximas datas.",
    },
    "no-completed": {
      icon: CheckCircle2,
      title: "Ainda não há ações concluídas",
      description:
        "Atualize o progresso das ações em andamento conforme você executa as etapas planejadas.",
    },
    "no-results": {
      icon: Filter,
      title: "Nenhum resultado para os filtros aplicados",
      description:
        "Ajuste a busca, status ou responsável para encontrar a ação que procura.",
      cta: onClearFilters
        ? { label: "Limpar filtros", onClick: onClearFilters }
        : undefined,
    },
  };

  const def = defs[variant];
  const Icon = def.icon ?? Inbox;
  const cta = def.cta;

  return (
    <div className={formSurface.empty.container}>
      <span className={formSurface.empty.iconWrap}>
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <p className={formSurface.empty.title}>{def.title}</p>
      <p className={formSurface.empty.description}>{def.description}</p>
      {cta ? (
        cta.href ? (
          <Link href={cta.href} className={`${formSurface.secondaryButtonSm} mt-2`}>
            {cta.label}
          </Link>
        ) : (
          <button
            type="button"
            onClick={cta.onClick}
            className={`${formSurface.secondaryButtonSm} mt-2`}
          >
            {cta.label}
          </button>
        )
      ) : null}
    </div>
  );
}
