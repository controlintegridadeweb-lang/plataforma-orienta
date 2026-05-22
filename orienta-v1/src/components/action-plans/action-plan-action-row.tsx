"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, UserCircle2 } from "lucide-react";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { PlanStatusBadge } from "@/components/plano-acao/plan-status-badge";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";

function formatDueDate(value: string | null | undefined): string {
  if (!value) return "Sem prazo";
  try {
    return new Date(value).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return value;
  }
}

type Props = {
  actionText: string;
  status: PlanStatus;
  dueDate: string | null | undefined;
  responsibleName: string | null | undefined;
  responsibleSector: string | null | undefined;
  href?: string;
  onOpen?: () => void;
  openLabel?: string;
};

/** Linha de ação — padrão visual alinhado a cartões do Portfólio / recomendações. */
export function ActionPlanActionRow({
  actionText,
  status,
  dueDate,
  responsibleName,
  responsibleSector,
  href,
  onOpen,
  openLabel = "Abrir plano de ação",
}: Props) {
  const cta =
    href != null ? (
      <Link href={href} className={`${formSurface.primaryButtonSm} shrink-0`}>
        {openLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    ) : onOpen != null ? (
      <button type="button" onClick={onOpen} className={`${formSurface.primaryButtonSm} shrink-0`}>
        {openLabel}
        <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </button>
    ) : null;

  return (
    <li className="rounded-xl border border-slate-200/90 bg-slate-50/40 p-3.5 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-2">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">{actionText}</p>
          <div className="flex flex-wrap items-center gap-2">
            <PlanStatusBadge status={status} />
            <span className={`inline-flex items-center gap-1 ${typography.meta} text-slate-600`}>
              <CalendarClock className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              {formatDueDate(dueDate)}
            </span>
            <span className={`inline-flex items-center gap-1 ${typography.meta} text-slate-600`}>
              <UserCircle2 className="h-3 w-3 shrink-0 text-slate-400" aria-hidden />
              {responsibleName?.trim() || "Sem responsável"}
              {responsibleSector?.trim() ? (
                <span className="text-slate-400"> · {responsibleSector}</span>
              ) : null}
            </span>
          </div>
        </div>
        {cta}
      </div>
    </li>
  );
}
