import Image from "next/image";
import { ClipboardList, Lightbulb, ListChecks } from "lucide-react";
import {
  ADMIN_PAGE_HERO_BLEED,
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE,
  ADMIN_PAGE_HERO_IMAGE_SIZES,
  ADMIN_PAGE_HERO_LAYOUT,
  ADMIN_PAGE_HERO_MEDIA,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/admin-page-layout";

/** @deprecated Use `ADMIN_PAGE_HERO_BLEED`. */
export const ADMIN_DASHBOARD_HERO_BLEED = ADMIN_PAGE_HERO_BLEED;

const HERO_IMAGE = "/assets/admin-dashboard-hero.png";

type Props = {
  activeForms: number;
  openRecommendations: number;
  plansInProgress: number;
};

function QuickBadge({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ClipboardList;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-slate-50/90 px-3 py-1.5 text-sm text-slate-700">
      <Icon className="h-3.5 w-3.5 shrink-0 text-brand-700" aria-hidden />
      <span>
        <span className="font-semibold tabular-nums text-slate-900">{value}</span>
        <span className="text-slate-600"> {label}</span>
      </span>
    </span>
  );
}

/** Hero institucional do dashboard administrativo. */
export function AdminDashboardHero({
  activeForms,
  openRecommendations,
  plansInProgress,
}: Props) {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Dashboard administrativo">
      <div className={ADMIN_PAGE_HERO_LAYOUT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Painel administrativo</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Dashboard administrativo</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            Acompanhe formulários, evidências, recomendações, planos de ação e indicadores
            institucionais da plataforma.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 sm:mt-6">
            <QuickBadge icon={ClipboardList} label="formulários ativos" value={activeForms} />
            <QuickBadge
              icon={Lightbulb}
              label="recomendações abertas"
              value={openRecommendations}
            />
            <QuickBadge icon={ListChecks} label="planos em andamento" value={plansInProgress} />
          </div>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA}>
          <Image
            src={HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES}
            className={ADMIN_PAGE_HERO_IMAGE}
          />
        </div>
      </div>
    </header>
  );
}
