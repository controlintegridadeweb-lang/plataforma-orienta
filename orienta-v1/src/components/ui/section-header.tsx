import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { typography } from "@/lib/layout/design-system";

export function SectionHeader({
  title,
  description,
  actions,
  kicker,
  icon: Icon,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  kicker?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <p className={typography.panelEyebrow}>{kicker}</p> : null}
        <div className="mt-1 flex items-center gap-2.5">
          {Icon ? (
            <span className={typography.sectionTitleIconWrap}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <h2 className={typography.sectionTitle}>{title}</h2>
        </div>
        {description ? (
          <p className={typography.sectionDescription}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
