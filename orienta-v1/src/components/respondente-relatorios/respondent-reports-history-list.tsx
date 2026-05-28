"use client";

import {
  Download,
  Eye,
  RefreshCw,
  Share2,
  Trash2,
} from "lucide-react";
import { statusPillBase } from "@/components/ui/status-pill";
import { workflowStatusEntry } from "@/lib/domain/status-registry";
import type { RespondentReportHistoryRow } from "@/lib/reports/respondent-presentation";
import { REPORT_KIND_META } from "@/lib/reports/respondent-presentation";
import { RespondentReportsEmptyState } from "./respondent-reports-empty-state";

type Props = {
  items: RespondentReportHistoryRow[];
  latestProcessingByForm: Map<string, number>;
  onDownload: (row: RespondentReportHistoryRow) => void;
  onPreview: (row: RespondentReportHistoryRow) => void;
  onRegenerate: (row: RespondentReportHistoryRow) => void;
  onShare: (row: RespondentReportHistoryRow) => void;
  onRemove: (row: RespondentReportHistoryRow) => void;
};

const ACTION_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/30";

function formatWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function HistoryStatusBadge({ outdated }: { outdated: boolean }) {
  const status = outdated ? "outdated" : "completed";
  const meta = workflowStatusEntry("report_job", status);
  const label = outdated ? meta.label : "Gerado";

  return (
    <span
      className={`${statusPillBase} px-2.5 py-1 text-xs font-medium ${meta.colorClass}`}
      title={meta.description ?? label}
    >
      {label}
    </span>
  );
}

function HistoryReportRow({
  row,
  outdated,
  onDownload,
  onPreview,
  onRegenerate,
  onShare,
  onRemove,
}: {
  row: RespondentReportHistoryRow;
  outdated: boolean;
  onDownload: () => void;
  onPreview: () => void;
  onRegenerate: () => void;
  onShare: () => void;
  onRemove: () => void;
}) {
  const kindLabel = REPORT_KIND_META[row.reportKind].label;

  return (
    <li className="group rounded-xl border border-slate-200/80 bg-white p-4 shadow-card transition-[border-color,box-shadow] hover:border-slate-300/90 hover:shadow-card-hover sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-5">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <h3 className="text-sm font-semibold text-slate-900 sm:text-sm">
              {row.formName}
            </h3>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-slate-600">
              {kindLabel}
            </span>
            <span className="rounded-md bg-slate-50 px-2 py-0.5 text-2xs font-medium text-slate-500 ring-1 ring-slate-200/80">
              PDF
            </span>
            <HistoryStatusBadge outdated={outdated} />
          </div>

          <p className="text-xs leading-relaxed text-slate-500">
            <time dateTime={row.generatedAt} className="font-medium text-slate-600">
              {formatWhen(row.generatedAt)}
            </time>
            <span className="mx-1.5 text-slate-300" aria-hidden>
              �
            </span>
            Vers�o FAMI v{row.processingVersion}
            {row.formTemplateVersion != null ? (
              <>
                <span className="mx-1.5 text-slate-300" aria-hidden>
                  �
                </span>
                Template v{row.formTemplateVersion}
              </>
            ) : null}
            <span className="mx-1.5 text-slate-300" aria-hidden>
              �
            </span>
            {row.generatedByLabel}
          </p>

          <p className="text-micro text-slate-400">Ref. {row.id.slice(0, 8)}�</p>
        </div>

        <div
          className="flex shrink-0 flex-wrap items-center gap-1 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0"
          role="toolbar"
          aria-label={`A��es para ${row.formName}`}
        >
          <button
            type="button"
            className={ACTION_BTN}
            title="Baixar novamente (regenera o PDF)"
            onClick={onDownload}
          >
            <Download className="h-4 w-4" aria-hidden />
            <span className="sr-only">Baixar</span>
          </button>
          <button type="button" className={ACTION_BTN} title="Visualizar" onClick={onPreview}>
            <Eye className="h-4 w-4" aria-hidden />
            <span className="sr-only">Visualizar</span>
          </button>
          <button type="button" className={ACTION_BTN} title="Regenerar" onClick={onRegenerate}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            <span className="sr-only">Regenerar</span>
          </button>
          <button type="button" className={ACTION_BTN} title="Compartilhar" onClick={onShare}>
            <Share2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Compartilhar</span>
          </button>
          <button
            type="button"
            className={`${ACTION_BTN} text-rose-600 hover:bg-rose-50 hover:text-rose-700`}
            title="Remover do hist�rico"
            onClick={onRemove}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
            <span className="sr-only">Remover</span>
          </button>
        </div>
      </div>
    </li>
  );
}

export function RespondentReportsHistoryList({
  items,
  latestProcessingByForm,
  onDownload,
  onPreview,
  onRegenerate,
  onShare,
  onRemove,
}: Props) {
  if (items.length === 0) {
    return <RespondentReportsEmptyState variant="no-reports" />;
  }

  return (
    <ul className="space-y-3" role="list" aria-label="Hist�rico de relat�rios">
      {items.map((row) => {
        const latest = latestProcessingByForm.get(row.formId) ?? row.processingVersion;
        const outdated = row.processingVersion < latest;
        return (
          <HistoryReportRow
            key={row.id}
            row={row}
            outdated={outdated}
            onDownload={() => onDownload(row)}
            onPreview={() => onPreview(row)}
            onRegenerate={() => onRegenerate(row)}
            onShare={() => onShare(row)}
            onRemove={() => onRemove(row)}
          />
        );
      })}
    </ul>
  );
}
