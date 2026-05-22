"use client";

import { Download } from "lucide-react";
import { Drawer } from "@/components/ui/drawer";
import { formSurface } from "@/lib/form-surface";
import type { RespondentReportHistoryRow } from "@/lib/reports/respondent-presentation";
import { REPORT_KIND_META } from "@/lib/reports/respondent-presentation";

type Props = {
  open: boolean;
  onClose: () => void;
  row: RespondentReportHistoryRow | null;
  previewUrl: string | null;
  previewLoading: boolean;
  onDownload: () => void;
};

export function RespondentReportsPreviewDrawer({
  open,
  onClose,
  row,
  previewUrl,
  previewLoading,
  onDownload,
}: Props) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={row ? `Pré-visualização · ${row.formName}` : "Pré-visualização"}
      description="Capa e resumo do relatório oficial. O PDF completo é obtido pelo botão baixar."
      footer={
        <button
          type="button"
          className={formSurface.primaryButton}
          onClick={onDownload}
          disabled={!row || previewLoading}
        >
          <Download className="h-4 w-4" aria-hidden />
          Baixar PDF
        </button>
      }
    >
      {!row ? null : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Capa institucional
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-900">Orienta · Relatório oficial</p>
            <p className="text-sm text-slate-600">{row.formName}</p>
            <p className="mt-2 text-xs text-slate-500">
              Versão FAMI v{row.processingVersion} ·{" "}
              {new Date(row.generatedAt).toLocaleString("pt-BR")}
            </p>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-slate-500">Tipo:</span>{" "}
              <strong>{REPORT_KIND_META[row.reportKind].label}</strong>
            </p>
            <p>
              <span className="text-slate-500">Formato:</span> <strong>PDF</strong>
            </p>
            <p>
              <span className="text-slate-500">Gerado por:</span>{" "}
              <strong>{row.generatedByLabel}</strong>
            </p>
            <p>
              <span className="text-slate-500">Metadados:</span>{" "}
              <code className="rounded bg-slate-100 px-1 text-xs">{row.filePath.slice(0, 48)}…</code>
            </p>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {previewLoading ? (
              <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                Carregando PDF…
              </div>
            ) : previewUrl ? (
              <iframe
                title="Pré-visualização PDF"
                src={previewUrl}
                className="h-[70vh] w-full min-h-[320px]"
              />
            ) : (
              <div className="px-4 py-8 text-center text-xs text-slate-500">
                Não foi possível carregar a pré-visualização.
              </div>
            )}
          </div>
        </div>
      )}
    </Drawer>
  );
}
