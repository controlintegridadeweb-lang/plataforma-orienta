"use client";

import {
  Building2,
  CheckCircle2,
  Clock,
  FileText,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { formSurface } from "@/lib/form-surface";

type FormOption = { id: string; name: string; version: number };

type Props = {
  organizationName: string;
  forms: FormOption[];
  formId: string;
  onFormChange: (formId: string) => void;
  processingVersion: number | null;
  lastProcessedAt: string | null;
  loading: boolean;
  onRefresh: () => void;
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
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

export function RespondentFamiProcessingCard({
  organizationName,
  forms,
  formId,
  onFormChange,
  processingVersion,
  lastProcessedAt,
  loading,
  onRefresh,
}: Props) {
  const selectedForm = forms.find((f) => f.id === formId);

  return (
    <section className={formSurface.card} aria-label="Processamento FAMI">
      <header
        className={`${formSurface.cardHeader} flex flex-wrap items-start justify-between gap-3`}
      >
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-brand-100">
            <Sparkles className="h-5 w-5 text-brand-700" aria-hidden />
          </span>
          <div>
            <p className={formSurface.cardTitle}>Processamento FAMI</p>
            <p className={formSurface.cardDescription}>
              Sua maturidade é recalculada a partir das respostas, evidências e validações.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden />
          {loading ? "Atualizando…" : "Atualizar"}
        </button>
      </header>

      <div className="grid gap-4 px-5 py-5 sm:px-6 md:grid-cols-2 lg:grid-cols-4">
        <InfoCell
          icon={Building2}
          label="Organização"
          value={organizationName || "—"}
        />
        <label className="flex flex-col gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <FileText className="h-3 w-3" aria-hidden />
            Formulário
          </span>
          <select
            value={formId}
            onChange={(e) => onFormChange(e.target.value)}
            disabled={forms.length === 0}
            className={`${formSurface.inputSelect} disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {forms.length === 0 ? (
              <option value="">Carregando formulários…</option>
            ) : (
              forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version})
                </option>
              ))
            )}
          </select>
          {selectedForm ? (
            <span className="text-[11px] text-slate-500">
              Versão do formulário: v{selectedForm.version}
            </span>
          ) : null}
        </label>
        <InfoCell
          icon={CheckCircle2}
          label="Versão do processamento"
          value={processingVersion != null ? `v${processingVersion}` : "—"}
          subtitle={loading ? "Calculando…" : "Última disponível"}
        />
        <InfoCell
          icon={Clock}
          label="Última atualização"
          value={formatDateTime(lastProcessedAt)}
          subtitle={
            lastProcessedAt
              ? "Recalcula automaticamente após reprocessamento."
              : "Aguardando primeiro cálculo."
          }
        />
      </div>
    </section>
  );
}

function InfoCell({
  icon: Icon,
  label,
  value,
  subtitle,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
        <Icon className="h-3 w-3" aria-hidden />
        {label}
      </span>
      <span className="line-clamp-2 text-sm font-semibold text-slate-900" title={value}>
        {value}
      </span>
      {subtitle ? <span className="text-[11px] text-slate-500">{subtitle}</span> : null}
    </div>
  );
}
