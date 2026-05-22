import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formSurface } from "@/lib/form-surface";

type Width = "form" | "wide" | "full";

const WIDTH_CLASS: Record<Width, string> = {
  form: "max-w-3xl",
  wide: "max-w-6xl",
  full: "max-w-none",
};

type Props = {
  title: string;
  description?: string;
  icon?: LucideIcon;
  width?: Width;
  children: ReactNode;
};

/** Seção de conteúdo das abas do formulário — painel institucional amplo. */
export function FormTabPanel({
  title,
  description,
  icon: Icon,
  width = "full",
  children,
}: Props) {
  return (
    <div className={`mx-auto w-full ${WIDTH_CLASS[width]}`}>
      <div className={formSurface.dashboardPanel}>
        <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 sm:px-6 md:px-7">
          {Icon ? (
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
          ) : null}
          <div className="min-w-0">
            <h3 className="text-base font-medium text-slate-900">{title}</h3>
            {description ? (
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{description}</p>
            ) : null}
          </div>
        </div>
        <div className={`${formSurface.dashboardPanelPadding} space-y-5 pt-5`}>{children}</div>
      </div>
    </div>
  );
}
