"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  staffPlanoAcaoDetailHref,
  staffPlanoAcaoHref,
  staffRecomendacoesHref,
  staffAreaFromPathname,
} from "@/lib/navigation/staff-paths";
import { STAFF_ANALYSIS_MODULE_CONTEXT } from "@/lib/staff-module-context";

type Props = {
  recommendationId: string;
  /** Superfície atual para destacar o passo ativo. */
  active: "recommendation" | "plan" | "monitoring";
};

/**
 * Trilha entre módulos da mesma recomendação — continuidade Recomendações ↔ Plano ↔ Monitoramento.
 */
export function StaffModuleTrail({ recommendationId, active }: Props) {
  const pathname = usePathname() ?? "";
  const area = staffAreaFromPathname(pathname);

  const steps = [
    {
      id: "recommendation" as const,
      label: "Recomendações",
      hint: "Portfólio",
      href: staffRecomendacoesHref(area, recommendationId),
    },
    {
      id: "plan" as const,
      label: "Plano de Ação",
      hint: "Execução",
      href: staffPlanoAcaoHref(area, recommendationId),
    },
    {
      id: "monitoring" as const,
      label: "Monitoramento",
      hint: "Supervisão",
      href: staffPlanoAcaoDetailHref(area, recommendationId, "monitoramento"),
    },
  ];

  return (
    <nav
      aria-label="Módulos desta recomendação"
      className="rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2.5 sm:px-4"
    >
      <p className="mb-2 text-[11px] font-medium leading-relaxed text-slate-500">
        {STAFF_ANALYSIS_MODULE_CONTEXT}
      </p>
      <ol className="flex flex-wrap items-center gap-1.5">
        {steps.map((step, index) => {
          const isActive = step.id === active;
          return (
            <li key={step.id} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span className="text-slate-300 select-none" aria-hidden>
                  ·
                </span>
              ) : null}
              <Link
                href={step.href}
                aria-current={isActive ? "page" : undefined}
                className={`inline-flex flex-col rounded-md px-2 py-1 text-left transition sm:flex-row sm:items-baseline sm:gap-1.5 ${
                  isActive
                    ? "bg-white font-semibold text-brand-800 shadow-sm ring-1 ring-brand-200/80"
                    : "text-slate-600 hover:bg-white/80 hover:text-slate-900"
                }`}
              >
                <span className="text-xs sm:text-[13px]">{step.label}</span>
                <span className="text-[10px] font-normal text-slate-500 sm:text-[11px]">
                  {step.hint}
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
