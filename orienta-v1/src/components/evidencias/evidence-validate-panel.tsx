"use client";

import { useState } from "react";
import type { EvidenceValidationEntry } from "@/lib/evidences/admin-service";
import { validateEvidence } from "@/lib/evidences/client";
import type { ValidationStatus } from "@/lib/evidences/schemas";
import { describeError, notify } from "@/lib/notify";
import { formSurface } from "@/lib/form-surface";
import { LoadingButton } from "@/components/ui/loading";

type Props = {
  evidenceId: string;
  onValidated: (entry: EvidenceValidationEntry) => void;
};

type Action = {
  status: ValidationStatus;
  label: string;
  tone: "emerald" | "rose" | "amber" | "sky" | "violet";
};

const ACTIONS: Action[] = [
  { status: "valid", label: "Aprovar", tone: "emerald" },
  { status: "invalid", label: "Rejeitar", tone: "rose" },
  { status: "partially_valid", label: "Parcial", tone: "amber" },
  { status: "complementation_requested", label: "Solicitar ajuste", tone: "sky" },
  { status: "waived", label: "Dispensar", tone: "violet" },
];

/** Neutro como `secondaryButtonSm`, com faixa lateral discreta para distinguir ações. */
const VALIDATION_ACTION_BASE =
  "inline-flex h-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400";

const TONE_ACCENT: Record<Action["tone"], string> = {
  emerald: "border-l-[3px] border-l-emerald-700/30 pl-[10px]",
  rose: "border-l-[3px] border-l-rose-700/30 pl-[10px]",
  amber: "border-l-[3px] border-l-amber-700/28 pl-[10px]",
  sky: "border-l-[3px] border-l-sky-700/30 pl-[10px]",
  violet: "border-l-[3px] border-l-violet-700/30 pl-[10px]",
};

function needsJustification(status: ValidationStatus): boolean {
  return (
    status === "invalid" ||
    status === "complementation_requested" ||
    status === "waived"
  );
}

export function EvidenceValidatePanel({ evidenceId, onValidated }: Props) {
  const [selected, setSelected] = useState<Action | null>(null);
  const [justification, setJustification] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    if (!selected) return;
    const req = needsJustification(selected.status);
    if (req && !justification.trim()) {
      setError("Justificativa obrigatoria para esta acao.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const entry = await validateEvidence(evidenceId, {
        status: selected.status,
        justification: justification.trim() || undefined,
      });
      notify.success("Validacao registrada.");
      onValidated(entry);
      setSelected(null);
      setJustification("");
    } catch (e: unknown) {
      notify.error(describeError(e, "Falha ao validar."));
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return (
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <button
            key={a.status}
            type="button"
            onClick={() => {
              setSelected(a);
              setJustification("");
              setError(null);
            }}
            className={`${VALIDATION_ACTION_BASE} ${TONE_ACCENT[a.tone]}`}
          >
            {a.label}
          </button>
        ))}
      </div>
    );
  }

  const req = needsJustification(selected.status);
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-700">
          Acao: <span className="font-semibold text-slate-900">{selected.label}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setSelected(null);
            setError(null);
          }}
          className="text-slate-500 hover:underline"
        >
          Cancelar
        </button>
      </div>
      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>
          Justificativa{req ? "" : " (opcional)"}
        </span>
        <textarea
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder={
            req ? "Descreva o motivo (obrigatorio)" : "Observacoes opcionais"
          }
          rows={3}
          maxLength={2000}
          className={formSurface.inputTextarea}
        />
      </label>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      <div className="flex justify-end">
        <LoadingButton
          type="button"
          pending={busy}
          pendingLabel="Confirmando..."
          onClick={handleConfirm}
          disabled={req && !justification.trim()}
          className={formSurface.primaryButtonSm}
        >
          Confirmar
        </LoadingButton>
      </div>
    </div>
  );
}
