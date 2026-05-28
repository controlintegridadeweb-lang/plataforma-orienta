"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { ScrollToTopButton } from "@/components/ui/scroll-to-top-button";

const STORAGE_KEY = "orienta.sidebar.collapsed";
const SIDEBAR_ID = "orienta-sidebar";

type SidebarContextValue = {
  /** Drawer mobile aberto. */
  mobileOpen: boolean;
  /** Sidebar recolhida no desktop. */
  collapsed: boolean;
  /** Estado visual do ícone (X no mobile com drawer aberto). */
  menuIconOpen: boolean;
  menuAriaLabel: string;
  toggleMenu: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleCollapsed: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    return {
      mobileOpen: false,
      collapsed: false,
      menuIconOpen: false,
      menuAriaLabel: "Abrir menu",
      toggleMenu: () => {},
      openDrawer: () => {},
      closeDrawer: () => {},
      toggleCollapsed: () => {},
    };
  }
  return ctx;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

/**
 * Layout principal autenticado.
 *
 * Desktop: sidebar fixa recolhível (ícone minimalista).
 * Mobile: drawer off-canvas com overlay; menu hambúrguer no header.
 */
export function SidebarShell({
  branding,
  user,
  nav,
  footer,
  children,
}: {
  branding: ReactNode;
  user: ReactNode;
  nav: ReactNode;
  footer: ReactNode;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();
  const isDesktop = useIsDesktop();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "true") {
        setCollapsed(true);
      }
    } catch {
      // localStorage indisponível
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? "true" : "false");
    } catch {
      // Ignora falha de persistência
    }
  }, [collapsed, mounted]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    if (mobileOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const openDrawer = useCallback(() => setMobileOpen(true), []);
  const closeDrawer = useCallback(() => setMobileOpen(false), []);
  const toggleCollapsed = useCallback(() => setCollapsed((v) => !v), []);

  const toggleMenu = useCallback(() => {
    if (isDesktop) {
      setCollapsed((v) => !v);
    } else {
      setMobileOpen((v) => !v);
    }
  }, [isDesktop]);

  const menuIconOpen = !isDesktop && mobileOpen;
  const menuAriaLabel = isDesktop
    ? collapsed
      ? "Expandir menu lateral"
      : "Recolher menu lateral"
    : mobileOpen
      ? "Fechar menu"
      : "Abrir menu";

  const ctxValue: SidebarContextValue = {
    mobileOpen,
    collapsed,
    menuIconOpen,
    menuAriaLabel,
    toggleMenu,
    openDrawer,
    closeDrawer,
    toggleCollapsed,
  };

  const desktopWidth = collapsed ? "md:w-19" : "md:w-80";

  return (
    <SidebarContext.Provider value={ctxValue}>
      <div className="flex min-h-screen bg-slate-50 text-slate-900">
        <aside
          id={SIDEBAR_ID}
          data-collapsed={collapsed ? "true" : "false"}
          className={[
            "fixed inset-y-0 left-0 z-40 flex w-[min(20rem,calc(100vw-2rem))] shrink-0 flex-col",
            "bg-brand-800 text-white",
            "shadow-xl ring-1 ring-black/10",
            "transition-[transform,width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            "md:relative md:z-auto md:translate-x-0 md:shadow-none",
            desktopWidth,
            mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          ].join(" ")}
          aria-label="Menu lateral de navegação"
        >
          {branding}
          {user}
          {nav}
          {footer}
        </aside>

        <button
          type="button"
          aria-label="Fechar menu"
          aria-hidden={!mobileOpen}
          tabIndex={mobileOpen ? 0 : -1}
          onClick={closeDrawer}
          className={[
            "fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-xs",
            "transition-opacity duration-300 ease-out md:hidden",
            mobileOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
          ].join(" ")}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {children}
          <ScrollToTopButton />
        </div>
      </div>
    </SidebarContext.Provider>
  );
}
