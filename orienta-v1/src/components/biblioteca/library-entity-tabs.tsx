"use client";

import { LIBRARY_TAB_LABEL, LIBRARY_TAB_ORDER } from "@/lib/library/config";
import type { LibraryCatalogEntity } from "@/lib/library/types";
import { underlineTabLinkClass } from "@/components/ui/underline-tabs";

type Props = {
  activeTab: LibraryCatalogEntity;
  onChange: (tab: LibraryCatalogEntity) => void;
};

/** Abas institucionais da Biblioteca Geral — integradas ao hero. */
export function LibraryEntityTabs({ activeTab, onChange }: Props) {
  return (
    <nav
      className="flex flex-wrap gap-x-0.5 overflow-x-auto border-b border-slate-200/80 bg-white px-3 sm:px-5"
      aria-label="Abas da Biblioteca Geral"
    >
      {LIBRARY_TAB_ORDER.map((entity) => {
        const active = activeTab === entity;
        return (
          <button
            key={entity}
            type="button"
            onClick={() => onChange(entity)}
            className={underlineTabLinkClass(active, true)}
            aria-current={active ? "page" : undefined}
          >
            {LIBRARY_TAB_LABEL[entity]}
          </button>
        );
      })}
    </nav>
  );
}
