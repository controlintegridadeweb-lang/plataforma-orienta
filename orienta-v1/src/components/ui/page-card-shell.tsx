import type { ReactNode } from "react";
import { layout } from "@/lib/design-system";
import { formSurface } from "@/lib/form-surface";
import { PageCardHero } from "@/components/ui/page-card-hero";

type Props = {
  title: string;
  description?: string;
  kicker?: string;
  headerPrefix?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  afterHeader?: ReactNode;
  children: ReactNode;
  /** Exibe a ilustração de preenchimento de formulário no cabeçalho. */
  illustration?: boolean;
};

/** Painel único com cabeçalho brand — perfil, editor de formulário e listagens. */
export function PageCardShell({
  title,
  description,
  kicker,
  headerPrefix,
  badge,
  actions,
  afterHeader,
  children,
  illustration = false,
}: Props) {
  return (
    <div className={layout.pageStack}>
      <div className={`${formSurface.card} overflow-hidden`}>
        {illustration ? (
          <PageCardHero
            kicker={kicker}
            title={title}
            description={description}
            headerPrefix={headerPrefix}
            badge={badge}
            actions={actions}
            afterHeader={afterHeader}
          />
        ) : (
          <>
            <div className={`${formSurface.cardHeader} border-b border-slate-100/80`}>
              <div className="space-y-3">
                {headerPrefix}
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 space-y-3">
                    <div>
                      {kicker ? (
                        <p className="text-sm font-medium text-slate-500">{kicker}</p>
                      ) : null}
                      <h2
                        className={`text-xl font-semibold tracking-tight text-slate-900 ${
                          kicker ? "mt-1" : ""
                        }`}
                      >
                        {title}
                      </h2>
                      {description ? (
                        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
                          {description}
                        </p>
                      ) : null}
                    </div>
                    {badge}
                  </div>
                  {actions ? (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
                  ) : null}
                </div>
              </div>
            </div>
            {afterHeader}
          </>
        )}

        <div className="bg-white px-4 py-6 sm:px-6 sm:py-7">{children}</div>
      </div>
    </div>
  );
}
