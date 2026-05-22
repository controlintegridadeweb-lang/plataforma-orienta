"use client";



import { Inbox, ShieldCheck } from "lucide-react";



type EmptyKind = "none" | "no-results" | "no-overdue";



type Props = {

  kind: EmptyKind;

  onClear?: () => void;

};



const CONFIG: Record<

  EmptyKind,

  {

    icon: typeof Inbox;

    title: string;

    description: string;

    iconBg: string;

    iconColor: string;

  }

> = {

  none: {

    icon: Inbox,

    title: "Nenhum plano cadastrado ainda",

    description:

      "Quando as organizações cadastrarem planos para as recomendações, eles aparecerão aqui.",

    iconBg: "bg-slate-50",

    iconColor: "text-slate-500",

  },

  "no-results": {

    icon: Inbox,

    title: "Nenhum plano com os filtros atuais",

    description: "Ajuste ou limpe os filtros para ver mais resultados.",

    iconBg: "bg-slate-50",

    iconColor: "text-slate-500",

  },

  "no-overdue": {

    icon: ShieldCheck,

    title: "Nenhum plano atrasado",

    description: "Todas as ações vinculadas estão dentro do prazo.",

    iconBg: "bg-brand-50",

    iconColor: "text-brand-800",

  },

};



export function AdminActionPlanEmptyState({ kind, onClear }: Props) {

  const cfg = CONFIG[kind];

  const Icon = cfg.icon;

  return (

    <section className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200/90 bg-white px-6 py-10 text-center">

      <span className={`flex h-12 w-12 items-center justify-center rounded-full ${cfg.iconBg}`}>

        <Icon className={`h-6 w-6 ${cfg.iconColor}`} aria-hidden />

      </span>

      <p className="text-sm font-semibold text-slate-900">{cfg.title}</p>

      <p className="max-w-md text-xs text-slate-500">{cfg.description}</p>

      {kind === "no-results" && onClear ? (

        <button

          type="button"

          onClick={onClear}

          className="mt-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-500"

        >

          Limpar filtros

        </button>

      ) : null}

    </section>

  );

}

