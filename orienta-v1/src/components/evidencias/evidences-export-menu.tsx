"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileText, Table2 } from "lucide-react";
import type { ListEvidencesFilters } from "@/lib/evidences/client";
import type { EvidenceExportFormat } from "@/lib/evidences/schemas";
import { describeError, notify } from "@/lib/notify";
import { downloadEvidencesExport } from "@/lib/evidences/client";
import { formSurface } from "@/lib/form-surface";

type Props = {
  filters: ListEvidencesFilters;
  selectedIds: string[];
  disabled?: boolean;
};

const OPTIONS: Array<{
  format: EvidenceExportFormat;
  label: string;
  icon: typeof FileText;
  hint: string;
}> = [
  {
    format: "pdf",
    label: "Exportar PDF",
    icon: FileText,
    hint: "Resumo e linhas exportadas.",
  },
  {
    format: "csv",
    label: "Exportar CSV",
    icon: Table2,
    hint: "Ponto e virgula, Excel pt-BR.",
  },
];

export function EvidencesExportMenu({ filters, selectedIds, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<EvidenceExportFormat | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(event: MouseEvent) {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function handleExport(format: EvidenceExportFormat) {
    setOpen(false);
    setPending(format);
    try {
      await notify.promise(
        downloadEvidencesExport(format, filters, selectedIds),
        {
          loading: `Gerando ${format.toUpperCase()}...`,
          success: "Download iniciado.",
          error: (err) => describeError(err, "Falha ao exportar."),
        },
      );
    } finally {
      setPending(null);
    }
  }

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className={formSurface.secondaryButtonSm}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || pending !== null}
      >
        <Download className="h-4 w-4" aria-hidden />
        Exportar
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg ring-1 ring-slate-100"
        >
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.format}
                type="button"
                role="menuitem"
                disabled={pending !== null}
                onClick={() => handleExport(opt.format)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="mt-0.5 h-4 w-4 text-brand-700" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">{opt.label}</span>
                  <span className="block text-xs text-slate-500">{opt.hint}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
