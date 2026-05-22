"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Barra de progresso de rota da Plataforma Orienta.
 *
 * Estrategia: como o App Router do Next.js suspende durante navegacoes
 * com `loading.tsx`, interceptamos cliques em <a> internos para mostrar
 * a barra imediatamente. Quando `pathname` muda (ou em 8s de timeout),
 * a barra completa e some. Sem dependencias externas.
 *
 * Respeita `prefers-reduced-motion` ao desativar a animacao da barra.
 */
export function RouteProgressBar() {
  const pathname = usePathname();
  const [active, setActive] = useState(false);
  const [progress, setProgress] = useState(0);
  const tickerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(false);
  const finishRef = useRef<() => void>(() => {});

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    function finish() {
      if (tickerRef.current) {
        clearInterval(tickerRef.current);
        tickerRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setProgress(100);
      fadeRef.current = setTimeout(() => {
        setActive(false);
        setProgress(0);
      }, 220);
    }

    function start() {
      if (fadeRef.current) {
        clearTimeout(fadeRef.current);
        fadeRef.current = null;
      }
      setActive(true);
      setProgress(8);
      if (tickerRef.current) clearInterval(tickerRef.current);
      tickerRef.current = setInterval(() => {
        setProgress((current) => {
          if (current >= 90) return current;
          const delta = current < 30 ? 6 : current < 60 ? 3 : 1.5;
          return Math.min(90, current + delta);
        });
      }, 220);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => finish(), 8000);
    }

    finishRef.current = finish;

    function isInternalNavigation(target: HTMLAnchorElement, event: MouseEvent): boolean {
      if (event.defaultPrevented) return false;
      if (event.button !== 0) return false;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;
      if (target.target && target.target !== "_self") return false;
      const href = target.getAttribute("href");
      if (!href) return false;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
      try {
        const url = new URL(target.href);
        if (url.origin !== window.location.origin) return false;
        const samePath = url.pathname === window.location.pathname;
        const sameQuery = url.search === window.location.search;
        if (samePath && sameQuery) return false;
      } catch {
        return false;
      }
      return true;
    }

    function onClick(event: MouseEvent) {
      const anchor = (event.target as HTMLElement | null)?.closest("a") as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      if (!isInternalNavigation(anchor, event)) return;
      start();
    }

    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  useEffect(() => {
    if (!activeRef.current) return;
    finishRef.current();
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (tickerRef.current) clearInterval(tickerRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, []);

  if (!active && progress === 0) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5"
    >
      <div
        className="h-full bg-brand-500 shadow-[0_0_8px_rgba(90,158,138,0.6)] transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          width: `${progress}%`,
          opacity: active ? 1 : 0,
        }}
      />
    </div>
  );
}
