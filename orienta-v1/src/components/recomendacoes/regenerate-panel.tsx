"use client";

import { ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";
import type { RecommendationFilterOptions } from "@/lib/recommendations/admin-service";
import { regenerateRecommendations } from "@/lib/recommendations/client";
import { formSurface } from "@/lib/form-surface";

type Props = {
  filters: RecommendationFilterOptions;
  onCompleted: () => void;
};

export function RegeneratePanel({ filters, onCompleted }: Props) {
  const [formId, setFormId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const canRegenerate = Boolean(formId && organizationId);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await regenerateRecommendations({ formId, organizationId });
      setMessage(
        `Regeneradas ${result.recommendationsCreated} recomendacoes (versao ${result.processingVersion}). ${result.warning}`,
      );
      onCompleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao regenerar.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <details className={`${formSurface.card} group overflow-visible ring-amber-100/80`}>
      <summary className="flex cursor-pointer list-none items-center gap-3 border-b border-amber-100/90 bg-gradient-to-r from-amber-50/90 via-white to-white px-4 py-3.5 marker:content-none [&::-webkit-details-marker]:hidden sm:px-5">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-amber-100">
          <RefreshCw className="h-5 w-5 text-amber-700" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Regenerar recomendações</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
            Recalcula FAMI e substitui textos persistidos para um par formulário + organização.{" "}
            <strong className="font-semibold text-amber-900">Substitui textos já editados</strong> pelos da biblioteca.
          </p>
        </div>
        <ChevronDown className="h-5 w-5 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
      </summary>
      <div className={`${formSurface.body} space-y-4 border-t border-slate-100/90 bg-white`}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Formulário</span>
            <select
              value={formId}
              onChange={(e) => setFormId(e.target.value)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Selecione…</option>
              {filters.forms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} (v{f.version})
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Organização</span>
            <select
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              className={`${formSurface.inputSelect} font-normal normal-case tracking-normal`}
            >
              <option value="">Selecione…</option>
              {filters.organizations.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col justify-end gap-2 lg:flex-row lg:items-end lg:justify-start">
            {confirming ? (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
                <span className="font-semibold">Confirmar regeneração?</span>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={busy}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-rose-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700 disabled:opacity-50"
                >
                  {busy ? "Regenerando…" : "Sim, regenerar"}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className={formSurface.secondaryButtonSm}
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canRegenerate || busy}
                onClick={() => setConfirming(true)}
                className={`${formSurface.primaryButton} h-10 lg:max-w-xs`}
              >
                Prosseguir com regeneração
              </button>
            )}
          </div>
        </div>
        {error ? <p className={formSurface.messageError}>{error}</p> : null}
        {message ? <p className={formSurface.messageSuccess}>{message}</p> : null}
      </div>
    </details>
  );
}
