import Image from "next/image";
import type { ReactNode } from "react";
import { FORM_WORKSPACE_HERO_IMAGE } from "@/lib/config/page-assets/form-workspace-hero-image";

type Props = {
  kicker?: string;
  title: string;
  description?: string;
  headerPrefix?: ReactNode;
  badge?: ReactNode;
  actions?: ReactNode;
  afterHeader?: ReactNode;
};

export function PageCardHero({
  kicker,
  title,
  description,
  headerPrefix,
  badge,
  actions,
  afterHeader,
}: Props) {
  return (
    <>
      <div className="relative overflow-hidden border-b border-slate-200/40 bg-linear-to-b from-brand-50/80 via-white to-white">
        <div className="relative flex flex-col lg:min-h-56 lg:flex-row lg:items-stretch xl:min-h-60">
          <div className="flex min-w-0 flex-1 flex-col justify-center px-5 py-7 sm:px-7 sm:py-8 lg:max-w-[52%] lg:px-8 lg:py-9">
            {headerPrefix ? <div className="mb-3">{headerPrefix}</div> : null}
            {kicker ? (
              <p className="text-sm font-medium text-slate-500">{kicker}</p>
            ) : null}
            <h2
              className={`text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl ${
                kicker ? "mt-1" : ""
              }`}
            >
              {title}
            </h2>
            {description ? (
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-sm">
                {description}
              </p>
            ) : null}
            {badge ? <div className="mt-3">{badge}</div> : null}
            {actions ? <div className="mt-4 flex flex-wrap items-center gap-2">{actions}</div> : null}
          </div>

          <div className="relative flex min-h-48 flex-1 items-end justify-center px-2 pb-0 pt-1 sm:min-h-56 lg:min-h-0 lg:items-end lg:justify-end lg:px-3 lg:pb-0">
            <Image
              src={FORM_WORKSPACE_HERO_IMAGE}
              alt=""
              width={800}
              height={560}
              priority
              sizes="(max-width: 1024px) 90vw, 420px"
              className="relative z-1 h-auto w-full max-w-88 object-contain object-bottom sm:max-w-104 lg:max-h-60 lg:max-w-88 xl:max-h-64 xl:max-w-96"
            />
          </div>
        </div>
      </div>
      {afterHeader}
    </>
  );
}
