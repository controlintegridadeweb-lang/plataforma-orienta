"use client";

import Link from "next/link";
import {
  ClipboardList,
  Download,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { levelMeta } from "@/lib/fami/respondent-presentation";
import { PanelHeroHeader } from "@/components/ui/panel-hero-header";
import { formSurface } from "@/lib/layout/form-surface";
import { RespondentFamiLevelBadge } from "./respondent-fami-level-badge";

type Props = {
  percentage: number | null;
  level: number | null;
  loading: boolean;
  onRefresh: () => void;
  onExport: () => void;
};

export function RespondentFamiHeader({
  percentage,
  level,
  loading,
  onRefresh,
  onExport,
}: Props) {
  const meta = level != null ? levelMeta(level) : null;
  return (
    <PanelHeroHeader
      title="Pontuação FAMI"
      description="Visualize o score de maturidade institucional e explore o panorama por eixo, seções e evolução. Os indicadores consolidam respostas, evidências e validações do diagnóstico."
      actions={
        <>
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            className={formSurface.secondaryButtonSm}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              aria-hidden
            />
            Atualizar
          </button>
          <button
            type="button"
            onClick={onExport}
            className={formSurface.secondaryButtonSm}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Exportar relatório
          </button>
          <Link
            href="/respondente/portfolio-recomendacoes"
            className={`${formSurface.primaryButtonSm} shrink-0`}
          >
            <ClipboardList className="h-3.5 w-3.5" aria-hidden />
            Ver recomendações
          </Link>
        </>
      }
      footer={
        <div
          className={`flex flex-wrap items-center gap-2 rounded-xl border px-4 py-2.5 text-xs ${
            percentage == null
              ? "border-slate-200 bg-white text-slate-700"
              : "border-brand-100 bg-brand-50/60 text-slate-700"
          }`}
          role="status"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-brand-100">
            <Sparkles className="h-4 w-4 text-brand-700" aria-hidden />
          </span>
          <span className="font-medium">
            {percentage == null
              ? "Selecione um formulário para visualizar sua maturidade institucional."
              : meta
                ? `Maturidade atual: ${percentage.toFixed(1)}% · ${meta.label}.`
                : `Maturidade atual: ${percentage.toFixed(1)}%.`}
          </span>
        </div>
      }
    >
      {level != null ? (
        <div className="mt-2">
          <RespondentFamiLevelBadge level={level} size="md" />
        </div>
      ) : null}
    </PanelHeroHeader>
  );
}
