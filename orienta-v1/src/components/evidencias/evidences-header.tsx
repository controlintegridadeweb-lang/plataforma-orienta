"use client";



import { RefreshCw } from "lucide-react";

import { PanelHeroHeader } from "@/components/ui/panel-hero-header";

import { formSurface } from "@/lib/layout/form-surface";
import { evidenceComplementation } from "@/lib/labels/complementation-terms";

import type { ListEvidencesFilters } from "@/lib/evidences/client";

import { EvidencesExportMenu } from "./evidences-export-menu";



type Props = {

  title?: string;

  subtitle?: string;

  onRefresh: () => void;

  refreshing: boolean;

  exportFilters: ListEvidencesFilters;

  selectedIds: string[];

};



export function EvidencesHeader({

  title = "Evidências e Complementações",

  subtitle = evidenceComplementation.navDescription,

  onRefresh,

  refreshing,

  exportFilters,

  selectedIds,

}: Props) {

  return (

    <PanelHeroHeader

      title={title}

      description={subtitle}

      actions={

        <>

          <button

            type="button"

            onClick={onRefresh}

            disabled={refreshing}

            className={formSurface.secondaryButtonSm}

          >

            <RefreshCw

              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}

              aria-hidden

            />

            Atualizar

          </button>

          <EvidencesExportMenu

            filters={exportFilters}

            selectedIds={selectedIds}

            disabled={refreshing}

          />

        </>

      }

    />

  );

}

