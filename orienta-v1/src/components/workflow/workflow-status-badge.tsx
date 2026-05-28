"use client";

import { statusPillBase } from "@/components/ui/status-pill";
import {
  workflowStatusEntry,
  type WorkflowStatusDomain,
  type WorkflowStatusMap,
} from "@/lib/domain/status-registry";

type BaseProps = {
  className?: string;
  /** Classes extras no ícone (ex.: `animate-spin` para processamento). */
  iconClassName?: string;
  /** `compact` para listas densas; `md` para drawers. */
  size?: "compact" | "default" | "md";
  /** Prefixo opcional para aria-label / contextualização */
  ariaPrefix?: string;
  /** Mantido por compatibilidade — pill e chip usam o mesmo visual discreto. */
  presentation?: "pill" | "chip";
  /** Ícones desligados por padrão (visual minimalista). */
  showIcon?: boolean;
};

export type WorkflowStatusBadgeProps = {
  [D in WorkflowStatusDomain]: BaseProps & { domain: D; status: WorkflowStatusMap[D] };
}[WorkflowStatusDomain];

/**
 * Badge único para status de workflow: rótulos/cores via {@link workflowStatusEntry}.
 */
export function WorkflowStatusBadge(props: WorkflowStatusBadgeProps) {
  const {
    domain,
    status,
    className = "",
    iconClassName = "",
    size = "default",
    ariaPrefix,
    showIcon = false,
  } = props;

  const meta = workflowStatusEntry(domain, status as never);
  const Icon = meta.icon;
  const surfaceClass = meta.chipColorClass ?? meta.colorClass;

  const textSize =
    size === "compact" ? "text-2xs" : size === "md" ? "text-xs" : "text-micro";
  const pad = size === "md" ? "px-2.5 py-1" : "px-2 py-0.5";

  const labelParts = [ariaPrefix, meta.label].filter(Boolean);

  return (
    <span
      className={`${statusPillBase} ${pad} ${textSize} ${surfaceClass} ${className}`.trim()}
      title={meta.description ?? meta.label}
      aria-label={labelParts.join(": ")}
    >
      {showIcon && Icon ? (
        <Icon
          className={`mr-0.5 h-3 w-3 shrink-0 opacity-70 ${iconClassName}`.trim()}
          aria-hidden
        />
      ) : null}
      {meta.label}
    </span>
  );
}

/** Alias para uso gradual onde o código já chama `StatusBadge` de forma genérica. */
export const DomainWorkflowStatusBadge = WorkflowStatusBadge;
