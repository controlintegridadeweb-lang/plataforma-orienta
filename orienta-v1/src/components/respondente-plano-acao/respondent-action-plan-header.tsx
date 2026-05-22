"use client";



import { ArrowRight, Download, LayoutGrid, PlusCircle, RefreshCw } from "lucide-react";

import Link from "next/link";

import { PanelHeroHeader } from "@/components/ui/panel-hero-header";

import { RESPONDENT_PORTFOLIO_LIST_PATH } from "@/lib/navigation/respondent-portfolio-paths";

import { formSurface } from "@/lib/form-surface";



type Props = {

  onRefresh: () => void;

  refreshing: boolean;

  onExport?: () => void;

  onNewAction?: () => void;

};



export function RespondentActionPlanHeader({

  onRefresh,

  refreshing,

  onExport,

  onNewAction,

}: Props) {

  return (

    <PanelHeroHeader

      title="Plano de Ação"

      description={

        <>

          Visão operacional: cada cartão é uma{" "}

          <strong className="font-semibold text-slate-700">linha de execução</strong> ligada a uma

          recomendação. No{" "}

          <strong className="font-semibold text-slate-700">Portfólio</strong> você prioriza e abre o

          contexto; aqui acompanha prazos e progresso de todas as linhas.

        </>

      }

      actions={

        <>

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

          {onExport ? (

            <button type="button" onClick={onExport} className={formSurface.secondaryButtonSm}>

              <Download className="h-3.5 w-3.5" aria-hidden />

              Exportar

            </button>

          ) : null}

          {onNewAction ? (

            <button type="button" onClick={onNewAction} className={formSurface.primaryButtonSm}>

              <PlusCircle className="h-3.5 w-3.5" aria-hidden />

              Nova ação

            </button>

          ) : (

            <>

              <Link href={RESPONDENT_PORTFOLIO_LIST_PATH} className={formSurface.secondaryButtonSm}>

                <LayoutGrid className="h-3.5 w-3.5" aria-hidden />

                Ir ao Portfólio

              </Link>

              <Link href={RESPONDENT_PORTFOLIO_LIST_PATH} className={formSurface.primaryButtonSm}>

                Nova ação

                <ArrowRight className="h-3.5 w-3.5" aria-hidden />

              </Link>

            </>

          )}

        </>

      }

    />

  );

}

