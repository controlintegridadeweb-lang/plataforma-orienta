"use client";

import { ChevronDown, Info, Sparkles } from "lucide-react";
import { useState } from "react";
import { formSurface } from "@/lib/form-surface";
import type { RespondentReportFormat, RespondentReportKind } from "@/lib/reports/respondent-presentation";
import {
  REPORT_FORMAT_META,
  REPORT_KIND_META,
  canGenerateOfficialPdf,
} from "@/lib/reports/respondent-presentation";
import { RespondentReportTypeSelector } from "./respondent-report-type-selector";
import { RespondentReportsGenerationProgress } from "./respondent-reports-generation-progress";

export type ReportFormOption = {
  id: string;
  name: string;
  version: number;
  latestProcessingVersion: number;
};

type Props = {
  organizationName: string;
  forms: ReportFormOption[];
  formId: string;
  onFormChange: (id: string) => void;
  processingVersions: number[];
  processingVersion: number | null;
  onProcessingVersionChange: (v: number | null) => void;
  reportKind: RespondentReportKind;
  onReportKindChange: (k: RespondentReportKind) => void;
  format: RespondentReportFormat;
  onFormatChange: (f: RespondentReportFormat) => void;
  generating: boolean;
  generationFinished: boolean;
  onGenerate: () => void;
};

export function RespondentReportsExportCenter({
  organizationName,
  forms,
  formId,
  onFormChange,
  processingVersions,
  processingVersion,
  onProcessingVersionChange,
  reportKind,
  onReportKindChange,
  format,
  onFormatChange,
  generating,
  generationFinished,
  onGenerate,
}: Props) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const canGo = canGenerateOfficialPdf(reportKind, format) && Boolean(formId) && processingVersion != null;

  return (
    <section className={formSurface.card}>
      <header
        className={`${formSurface.cardHeader} flex flex-wrap items-start justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-brand-100">
            <Sparkles className="h-5 w-5 text-brand-700" aria-hidden />
          </span>
          <div>
            <h2 className={formSurface.cardTitle}>Central de exportação</h2>
            <p className={formSurface.cardDescription}>
              Escolha o diagnóstico, a versão de processamento e o documento. Dados sempre a partir
              do que está persistido no servidor (FAMI, recomendações e planos).
            </p>
          </div>
        </div>
      </header>

      <div className={formSurface.body}>
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Organização</span>
            <div className={formSurface.readOnlyField}>{organizationName || "—"}</div>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formulário</span>
            <select
              value={formId}
              onChange={(e) => onFormChange(e.target.value)}
              className={formSurface.inputSelect}
              disabled={forms.length === 0}
            >
              {forms.length === 0 ? (
                <option value="">Nenhum com FAMI processado</option>
              ) : (
                forms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} · template v{f.version} · proc. v{f.latestProcessingVersion}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Versão do processamento FAMI</span>
            <select
              value={processingVersion ?? ""}
              onChange={(e) =>
                onProcessingVersionChange(
                  e.target.value === "" ? null : Number(e.target.value),
                )
              }
              className={formSurface.inputSelect}
              disabled={!formId || processingVersions.length === 0}
            >
              {processingVersions.length === 0 ? (
                <option value="">Carregando versões…</option>
              ) : (
                processingVersions.map((v) => (
                  <option key={v} value={v}>
                    Versão {v}
                    {v === (forms.find((x) => x.id === formId)?.latestProcessingVersion ?? 0)
                      ? " (mais recente)"
                      : ""}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formato de saída</span>
            <select
              value={format}
              onChange={(e) => onFormatChange(e.target.value as RespondentReportFormat)}
              className={formSurface.inputSelect}
            >
              {(Object.values(REPORT_FORMAT_META) as (typeof REPORT_FORMAT_META)[keyof typeof REPORT_FORMAT_META][]).map(
                (f) => (
                  <option
                    key={f.id}
                    value={f.id}
                    disabled={!f.available}
                    title={f.comingSoonHint ?? undefined}
                  >
                    {f.label}
                    {!f.available ? ` — ${f.comingSoonHint}` : ""}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className={`${formSurface.fieldGroup} opacity-60`} title="Em breve: filtro por período">
            <span className="inline-flex items-center gap-1">
              <span className={formSurface.label}>Período</span>
              <Info className="h-3 w-3 text-slate-400" aria-hidden />
            </span>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" className={formSurface.input} disabled title="Em breve" />
              <input type="date" className={formSurface.input} disabled title="Em breve" />
            </div>
          </label>
          <div className={`${formSurface.fieldGroup} flex flex-col justify-end`}>
            <span className={formSurface.label}>Tipo selecionado</span>
            <div className={formSurface.readOnlyField}>
              {REPORT_KIND_META[reportKind].label}
              {!REPORT_KIND_META[reportKind].pdfSupported ? (
                <span className="ml-2 text-[11px] text-amber-700">(PDF em expansão)</span>
              ) : null}
            </div>
          </div>
        </div>

        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100"
          aria-expanded={advancedOpen}
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          Filtros avançados e tipos de relatório
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition ${advancedOpen ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
        {advancedOpen ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/30 p-3">
            <RespondentReportTypeSelector value={reportKind} onChange={onReportKindChange} />
          </div>
        ) : null}

        <RespondentReportsGenerationProgress active={generating} finished={generationFinished} />

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onGenerate}
            disabled={!canGo || generating}
            title={
              !canGo
                ? "Ajuste tipo (Executivo ou Consolidado), formato PDF executivo e versão."
                : undefined
            }
            className={formSurface.primaryButton}
          >
            {generating ? "Gerando…" : "Gerar e baixar"}
          </button>
          {!canGo && !generating ? (
            <p className="text-xs text-slate-500">
              Hoje apenas <strong>PDF executivo</strong> para tipos{" "}
              <strong>Executivo</strong> ou <strong>Consolidado</strong> utilizam a rota oficial
              existente.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
