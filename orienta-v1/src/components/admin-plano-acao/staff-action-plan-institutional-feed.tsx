"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Send } from "lucide-react";
import type { SupervisionNoteEntry } from "@/lib/action-plans/admin-service";
import type { EvidenceListItem } from "@/lib/evidences/admin-service";
import type { RecommendationChangeEntry } from "@/lib/recommendations/admin-service";
import type { ActionPlanAction } from "@/lib/domain/action-plans";
import {
  createSupervisionNote,
  listSupervisionNotes,
} from "@/lib/action-plans/client";
import { listRecommendationHistory } from "@/lib/recommendations/client";
import {
  SUPERVISION_NOTE_META,
  SUPERVISION_NOTE_TYPE_ORDER,
  supervisionRoleLabel,
} from "@/lib/action-plans/supervision-presentation";
import type { SupervisionNoteType } from "@/lib/action-plans/schemas";
import { statusPillBase } from "@/components/ui/status-pill";
import { Spinner } from "@/components/ui/loading";
import { formSurface } from "@/lib/form-surface";
import { typography } from "@/lib/design-system";
import { notify } from "@/lib/notify";

export type InstitutionalFeedItem = {
  id: string;
  ts: string;
  author: string;
  roleLabel: string;
  noteType: SupervisionNoteType | "org_observation" | "validation_decision" | "status_change";
  body: string;
  source: "supervision" | "organization" | "audit" | "history";
};

function formatDateTime(iso: string): string {
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

function noteTypeLabel(type: InstitutionalFeedItem["noteType"]): string {
  if (type in SUPERVISION_NOTE_META) {
    return SUPERVISION_NOTE_META[type as SupervisionNoteType].label;
  }
  if (type === "org_observation") return "Observação da organização";
  if (type === "validation_decision") return "Parecer de evidência";
  if (type === "status_change") return "Decisão registrada";
  return "Registro";
}

function noteTypeBadgeClass(type: InstitutionalFeedItem["noteType"]): string {
  if (type in SUPERVISION_NOTE_META) {
    return SUPERVISION_NOTE_META[type as SupervisionNoteType].badgeClass;
  }
  if (type === "org_observation") return "bg-slate-100 text-slate-700";
  if (type === "validation_decision") return "bg-sky-50 text-sky-800";
  return "bg-amber-50 text-amber-800";
}

function mapHistoryEntry(entry: RecommendationChangeEntry): InstitutionalFeedItem | null {
  if (!entry.comment?.trim() && entry.field !== "status") return null;
  const body =
    entry.comment?.trim() ||
    (entry.field === "status"
      ? `Status alterado de ${entry.oldValue ?? "—"} para ${entry.newValue ?? "—"}.`
      : "");
  if (!body) return null;
  return {
    id: `hist-${entry.id}`,
    ts: entry.changedAt,
    author: entry.changedByName ?? "Equipe de supervisão",
    roleLabel: "Supervisão",
    noteType: entry.field === "status" ? "status_change" : "comment",
    body,
    source: "history",
  };
}

type Props = {
  recommendationId: string;
  plans: ActionPlanAction[];
  evidences: EvidenceListItem[];
};

export function StaffActionPlanInstitutionalFeed({
  recommendationId,
  plans,
  evidences,
}: Props) {
  const [notes, setNotes] = useState<SupervisionNoteEntry[]>([]);
  const [history, setHistory] = useState<RecommendationChangeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [noteType, setNoteType] = useState<SupervisionNoteType>("comment");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [noteRows, historyRows] = await Promise.all([
        listSupervisionNotes(recommendationId),
        listRecommendationHistory(recommendationId),
      ]);
      setNotes(noteRows);
      setHistory(historyRows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao carregar comentários.");
    } finally {
      setLoading(false);
    }
  }, [recommendationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const feedItems = useMemo(() => {
    const items: InstitutionalFeedItem[] = [];

    for (const note of notes) {
      items.push({
        id: note.id,
        ts: note.createdAt,
        author: note.authorName,
        roleLabel: supervisionRoleLabel(note.authorRole),
        noteType: note.noteType as SupervisionNoteType,
        body: note.body,
        source: "supervision",
      });
    }

    for (const entry of history) {
      const mapped = mapHistoryEntry(entry);
      if (mapped) items.push(mapped);
    }

    for (const plan of plans) {
      if (plan.observations?.trim()) {
        items.push({
          id: `obs-${plan.id}`,
          ts: plan.updatedAt,
          author: plan.responsibleName?.trim() || "Organização",
          roleLabel: "Respondente",
          noteType: "org_observation",
          body: plan.observations.trim(),
          source: "organization",
        });
      }
    }

    for (const ev of evidences) {
      for (const h of ev.history) {
        if (!h.justification?.trim()) continue;
        items.push({
          id: `ev-${ev.id}-${h.id}`,
          ts: h.validatedAt,
          author: "Auditoria de evidências",
          roleLabel: "Supervisão",
          noteType: "validation_decision",
          body: h.justification.trim(),
          source: "audit",
        });
      }
    }

    items.sort((a, b) => b.ts.localeCompare(a.ts));
    return items;
  }, [notes, history, plans, evidences]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const created = await createSupervisionNote({
        recommendationId,
        noteType,
        body: trimmed,
      });
      setNotes((prev) => [created, ...prev]);
      setBody("");
      notify.success("Registro publicado no feed institucional.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao publicar.";
      setError(msg);
      notify.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={`${formSurface.nestedCard} space-y-3 border-brand-100/80 bg-brand-50/10`}
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">Registrar parecer ou comentário</p>
          <p className={`mt-0.5 ${typography.meta}`}>
            Feed institucional visível na supervisão deste plano.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[minmax(10rem,12rem)_1fr]">
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Tipo</span>
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as SupervisionNoteType)}
              className={formSurface.inputSelect}
            >
              {SUPERVISION_NOTE_TYPE_ORDER.map((type) => (
                <option key={type} value={type}>
                  {SUPERVISION_NOTE_META[type].label}
                </option>
              ))}
            </select>
          </label>
          <label className={formSurface.fieldGroup}>
            <span className={formSurface.label}>Observação</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              maxLength={4000}
              placeholder="Descreva parecer, pendência, encaminhamento ou orientação à organização…"
              className={formSurface.inputTextarea}
            />
          </label>
        </div>
        {error ? <p className={formSurface.messageError}>{error}</p> : null}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1.5 disabled:opacity-50`}
          >
            <Send className="h-3.5 w-3.5" aria-hidden />
            {submitting ? "Publicando…" : "Publicar no feed"}
          </button>
        </div>
      </form>

      {loading ? (
        <p className="inline-flex items-center gap-2 text-sm text-slate-500">
          <Spinner size="sm" />
          Carregando feed…
        </p>
      ) : feedItems.length === 0 ? (
        <p className={`rounded-lg border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center ${typography.auxiliary}`}>
          Nenhum comentário ou decisão registrada. Use o formulário acima para iniciar o
          acompanhamento institucional.
        </p>
      ) : (
        <ul className="space-y-3">
          {feedItems.map((item) => (
            <li key={item.id}>
              <article className={`${formSurface.nestedCard} space-y-2.5`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {item.author.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{item.author}</p>
                      <p className={typography.meta}>{item.roleLabel}</p>
                    </div>
                  </div>
                  <time className="shrink-0 text-[11px] tabular-nums text-slate-400" dateTime={item.ts}>
                    {formatDateTime(item.ts)}
                  </time>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`${statusPillBase} ${noteTypeBadgeClass(item.noteType)}`}>
                    {noteTypeLabel(item.noteType)}
                  </span>
                  {item.source === "supervision" ? (
                    <span className={`${statusPillBase} bg-brand-50 text-brand-800`}>
                      Registro oficial
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{item.body}</p>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
