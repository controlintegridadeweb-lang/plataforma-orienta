import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cards, layout } from "@/lib/design-system";
import { SectionHeader } from "@/components/ui/section-header";

type PanelSectionProps = {
  title: string;
  description?: string;
  kicker?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  /** `plain`: título + conteúdo; `card`: painel branco com borda (padrão dashboard). */
  variant?: "plain" | "card";
  className?: string;
  contentClassName?: string;
  id?: string;
  children?: ReactNode;
};

/**
 * Bloco de conteúdo com título e subtítulo consistentes (`SectionHeader`).
 * Use dentro de shells e abas de detalhe para manter hierarquia visual.
 */
export function PanelSection({
  title,
  description,
  kicker,
  icon,
  actions,
  variant = "plain",
  className = "",
  contentClassName = "",
  id,
  children,
}: PanelSectionProps) {
  const header = (
    <SectionHeader
      title={title}
      description={description}
      kicker={kicker}
      icon={icon}
      actions={actions}
    />
  );

  if (variant === "card") {
    return (
      <section id={id} className={`${layout.sectionStack} ${className}`.trim()}>
        <div className={`${cards.dashboardPanel} ${cards.dashboardPanelPadding} ${contentClassName}`.trim()}>
          {header}
          {children}
        </div>
      </section>
    );
  }

  return (
    <section id={id} className={`${layout.sectionStack} ${className}`.trim()}>
      {header}
      <div className={contentClassName.trim() || undefined}>{children}</div>
    </section>
  );
}
