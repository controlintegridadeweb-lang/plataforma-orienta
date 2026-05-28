"use client";

import Image from "next/image";
import { RefreshCw } from "lucide-react";
import { EvidencesExportMenu } from "@/components/evidencias/evidences-export-menu";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";
import { ADMIN_EVIDENCES_HERO_IMAGE } from "@/lib/admin-evidences-hero-image";
import {
  ADMIN_PAGE_HERO_ACTIONS,
  ADMIN_PAGE_HERO_CLASS,
  ADMIN_PAGE_HERO_CONTENT,
  ADMIN_PAGE_HERO_DESCRIPTION,
  ADMIN_PAGE_HERO_IMAGE_COMPACT,
  ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT,
  ADMIN_PAGE_HERO_LAYOUT_COMPACT,
  ADMIN_PAGE_HERO_MEDIA_COMPACT,
  ADMIN_PAGE_HERO_OVERLINE,
  ADMIN_PAGE_HERO_TITLE,
} from "@/lib/admin-page-layout";
import type { ListEvidencesFilters } from "@/lib/evidences/client";
import { formSurface } from "@/lib/form-surface";

type Props = {
  onRefresh: () => void;
  refreshing: boolean;
  exportFilters: ListEvidencesFilters;
  selectedIds: string[];
};

/** Hero institucional de Evidências (admin) — integrado ao `PageShell` via bleed no pai. */
export function AdminEvidencesHero({
  onRefresh,
  refreshing,
  exportFilters,
  selectedIds,
}: Props) {
  return (
    <header className={ADMIN_PAGE_HERO_CLASS} aria-label="Evidências e Complementações">
      <div className={ADMIN_PAGE_HERO_LAYOUT_COMPACT}>
        <div className={ADMIN_PAGE_HERO_CONTENT}>
          <p className={ADMIN_PAGE_HERO_OVERLINE}>Validação e auditoria</p>
          <h2 className={ADMIN_PAGE_HERO_TITLE}>Evidências e Complementações</h2>
          <p className={ADMIN_PAGE_HERO_DESCRIPTION}>
            {evidenceComplementation.navDescription}
          </p>

          <div className={ADMIN_PAGE_HERO_ACTIONS}>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={formSurface.secondaryButtonSm}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
                aria-hidden
              />
              Atualizar
            </button>
            <EvidencesExportMenu
              filters={exportFilters}
              selectedIds={selectedIds}
              disabled={refreshing}
            />
          </div>
        </div>

        <div className={ADMIN_PAGE_HERO_MEDIA_COMPACT}>
          <Image
            src={ADMIN_EVIDENCES_HERO_IMAGE}
            alt=""
            width={800}
            height={560}
            priority
            sizes={ADMIN_PAGE_HERO_IMAGE_SIZES_COMPACT}
            className={ADMIN_PAGE_HERO_IMAGE_COMPACT}
          />
        </div>
      </div>
    </header>
  );
}
