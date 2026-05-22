"use client";

import { useEffect, useState } from "react";
import type {
  RecommendationListItem,
  RecommendationUpdateResult,
} from "@/lib/recommendations/admin-service";
import { updateRecommendation } from "@/lib/recommendations/client";
import type { RecommendationStatus } from "@/lib/recommendations/schemas";
import { formSurface } from "@/lib/form-surface";
import { STATUS_LABELS } from "./status-badge";

type Props = {
  item: RecommendationListItem;
  onUpdated: (result: RecommendationUpdateResult) => void;
};

const STATUSES: RecommendationStatus[] = [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
];

export function RecommendationActions({ item, onUpdated }: Props) {
  const [status, setStatus] = useState<RecommendationStatus>(item.status);
  const [editingText, setEditingText] = useState(false);
  const [text, setText] = useState(item.currentText);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStatus(item.status);
    setText(item.currentText);
    setEditingText(false);
    setComment("");
    setError(null);
  }, [item.id, item.status, item.currentText]);

  const dirty =
    status !== item.status || (editingText && text.trim() !== item.currentText);

  async function handleConfirm() {
    if (!dirty) return;
    setBusy(true);
    setError(null);
    try {
      const payload: {
        status?: RecommendationStatus;
        currentText?: string;
        comment?: string;
      } = {};
      if (status !== item.status) payload.status = status;
      if (editingText && text.trim() !== item.currentText) payload.currentText = text.trim();
      if (comment.trim()) payload.comment = comment.trim();

      const result = await updateRecommendation(item.id, payload);
      onUpdated(result);
      setEditingText(false);
      setComment("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao atualizar.");
    } finally {
      setBusy(false);
    }
  }

  function handleReset() {
    setStatus(item.status);
    setText(item.currentText);
    setEditingText(false);
    setComment("");
    setError(null);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 ring-1 ring-slate-100/80">
        <p className={formSurface.label}>Situação</p>
        <label className={`${formSurface.fieldGroup} mt-3`}>
          <span className={formSurface.label}>Status</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as RecommendationStatus)}
            className={`${formSurface.inputSelect} text-sm font-normal normal-case tracking-normal`}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm ring-1 ring-slate-100/70">
        <p className={formSurface.label}>Texto exibido ao respondente</p>
        {editingText ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-600">
              <span className="font-semibold text-slate-700">Original da biblioteca:</span>
              <p className="mt-1 whitespace-pre-wrap text-slate-600">{item.originalText}</p>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              maxLength={4000}
              className={formSurface.inputTextarea}
            />
            <button
              type="button"
              onClick={() => {
                setEditingText(false);
                setText(item.currentText);
              }}
              className="text-xs font-semibold text-slate-600 underline decoration-slate-300 underline-offset-2 hover:text-slate-900"
            >
              Cancelar edição de texto
            </button>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-sm leading-relaxed text-slate-800 line-clamp-4 whitespace-pre-wrap">
              {item.currentText}
            </p>
            <button
              type="button"
              onClick={() => setEditingText(true)}
              className={`${formSurface.secondaryButtonSm} font-medium`}
            >
              Editar texto completo
            </button>
          </div>
        )}
      </div>

      <label className={formSurface.fieldGroup}>
        <span className={formSurface.label}>Comentário no histórico (opcional)</span>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Registre o motivo da alteração para auditoria."
          rows={2}
          maxLength={2000}
          className={formSurface.inputTextarea}
        />
      </label>

      {error ? <p className={formSurface.messageError}>{error}</p> : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={handleReset}
          disabled={busy || !dirty}
          className={`${formSurface.secondaryButtonSm} disabled:opacity-50`}
        >
          Desfazer
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={busy || !dirty}
          className={`${formSurface.primaryButtonSm} disabled:opacity-60`}
        >
          {busy ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
