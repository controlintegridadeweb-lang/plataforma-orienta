import type { ReactNode } from "react";
import { layout, typography } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";

/**
 * Cabeçalho padrão de ferramentas dentro do `PageShell` (título local em `<h2>`;
 * o `<h1>` da rota fica no header global).
 */
export function PanelHeroHeader({
  title,
  description,
  status,
  footer,
  actions,
  children,
  className = "",
}: {
  title: string;
  description?: ReactNode;
  status?: ReactNode;
  footer?: ReactNode;
  actions?: ReactNode;
  /** Conteúdo extra abaixo do título (badges, chips, etc.). */
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header className={`${layout.sectionStack} border-b border-slate-100 pb-4 ${className}`.trim()}>
      <div className={`${formSurface.toolbar.container} border-b-0`}>
        <div className={`${formSurface.toolbar.leftGroup} min-w-0`}>
          <div>
            <h2 className={typography.panelHeroTitle}>{title}</h2>
            {description ? (
              <p className={typography.panelHeroLead}>{description}</p>
            ) : null}
            {status ? <div className="mt-2">{status}</div> : null}
            {children}
          </div>
        </div>
        {actions ? <div className={formSurface.toolbar.rightGroup}>{actions}</div> : null}
      </div>
      {footer}
    </header>
  );
}
