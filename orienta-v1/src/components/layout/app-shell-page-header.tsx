"use client";

import { usePathname } from "next/navigation";
import { getPageHeadingForPath } from "@/lib/config/page-headings";
import { typography } from "@/lib/design-system";
import { SidebarMobileRail } from "./sidebar-mobile-rail";

export function AppShellPageHeader({
  serverPathname,
  initialTitle,
  initialDescription,
}: {
  /** Pathname SSR (header `x-pathname`) para primeira pintura consistente */
  serverPathname: string;
  initialTitle: string;
  initialDescription?: string;
}) {
  const clientPathname = usePathname() ?? "";
  const pathname = clientPathname || serverPathname;
  const fromRoute = getPageHeadingForPath(pathname);
  const title = fromRoute.title || initialTitle;
  const description = fromRoute.description ?? initialDescription;

  return (
    <div className="sticky top-0 z-20 flex min-h-[var(--header-h)] min-w-0 border-b border-slate-200/90 bg-white/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-white/85">
      <SidebarMobileRail />
      <header className="flex min-w-0 flex-1 items-center px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0 flex-1">
          <h1 className={typography.pageTitle}>{title}</h1>
          {description ? <p className={typography.pageDescription}>{description}</p> : null}
        </div>
      </header>
    </div>
  );
}
