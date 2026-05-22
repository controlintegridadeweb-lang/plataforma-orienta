"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, FileSpreadsheet, FileText, Table2 } from "lucide-react";
import { describeError, notify } from "@/lib/notify";
import { downloadAnswersExport } from "@/lib/forms/answers-client";
import type {
  AnswersExportFormat,
  AnswersListFilters,
} from "@/lib/forms/answers-types";
import { formSurface } from "@/lib/form-surface";

type Props = {
  formId: string;
  filters: AnswersListFilters;
};

const OPTIONS: Array<{
  format: AnswersExportFormat;
  label: string;
  icon: typeof FileText;
  hint: string;
  disabled?: boolean;
}> = [
  {
    format: "pdf",
    label: "Exportar PDF",
    icon: FileText,
    hint: "Relatorio com resumo e lista de respondentes.",
  },
  {
    format: "csv",
    label: "Exportar CSV",
    icon: Table2,
    hint: "Arquivo separado por ponto-e-virgula (compativel com Excel pt-BR).",
  },
  {
    format: "xlsx",
    label: "Exportar Excel",
    icon: FileSpreadsheet,
    hint: "Em breve.",
    disabled: true,
  },
];

export function AnswersExportMenu({ formId, filters }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<AnswersExportFormat | null>(null);
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

  async function handleExport(format: AnswersExportFormat) {
    setOpen(false);
    setPending(format);
    try {
      await notify.promise(
        downloadAnswersExport(formId, format, { filters }),
        {
          loading: `Gerando ${format.toUpperCase()}...`,
          success: "Pronto. Download iniciado.",
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
        disabled={pending !== null}
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
                disabled={opt.disabled || pending !== null}
                onClick={() => handleExport(opt.format)}
                className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left text-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                title={opt.disabled ? "Em breve" : undefined}
              >
                <Icon className="mt-0.5 h-4 w-4 text-brand-700" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-slate-900">
                    {opt.label}
                  </span>
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
