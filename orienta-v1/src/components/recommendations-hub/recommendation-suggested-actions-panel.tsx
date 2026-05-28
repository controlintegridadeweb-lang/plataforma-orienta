"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ListChecks } from "lucide-react";
import { PanelSection } from "@/components/ui/panel-section";
import { LoadingButton } from "@/components/ui/loading";
import { formSurface } from "@/lib/layout/form-surface";
import {
  applyRespondentSuggestedActions,
  fetchRespondentSuggestedActions,
} from "@/lib/recommendations/client";
import type { SuggestedActionItem } from "@/lib/recommendations/suggested-actions";
import { describeError, notify } from "@/lib/notify";

type Props = {
  recommendationId: string;
  onApplied: () => Promise<void>;
};

export function RecommendationSuggestedActionsPanel({ recommendationId, onApplied }: Props) {
  const [suggestions, setSuggestions] = useState<SuggestedActionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const payload = await fetchRespondentSuggestedActions(recommendationId);
      setSuggestions(payload.suggestions);
      const pending = payload.suggestions
        .filter((s) => !s.alreadyApplied)
        .map((s) => s.index);
      setSelected(new Set(pending));
    } catch (e) {
      setSuggestions([]);
      notify.error(describeError(e, "Falha ao carregar sugestões."));
    } finally {
      setLoading(false);
    }
  }, [recommendationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const pending = useMemo(
    () => suggestions.filter((s) => !s.alreadyApplied),
    [suggestions],
  );

  if (loading) {
    return (
      <p className="text-sm text-slate-500" aria-live="polite">
        Carregando sugestões do formulário…
      </p>
    );
  }

  if (suggestions.length === 0) return null;

  function toggle(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function handleApply() {
    const indices = [...selected].filter((i) =>
      pending.some((s) => s.index === i),
    );
    if (indices.length === 0) {
      notify.info("Selecione ao menos uma sugestão pendente.");
      return;
    }
    setApplying(true);
    try {
      const result = await applyRespondentSuggestedActions(recommendationId, indices);
      notify.success(
        result.created > 0
          ? `${result.created} ação(ões) adicionada(s) ao plano.`
          : "Nenhuma ação nova foi criada.",
      );
      await onApplied();
      await load();
    } catch (e) {
      notify.error(describeError(e, "Falha ao adicionar sugestões."));
    } finally {
      setApplying(false);
    }
  }

  return (
    <PanelSection
      title="Sugestões do formulário"
      description={
        pending.length > 0
          ? "Ações definidas pelo administrador para este cenário. Revise e adicione ao seu plano."
          : "Todas as sugestões disponíveis já foram adicionadas ao plano."
      }
      variant="card"
      contentClassName="space-y-3"
      actions={
        pending.length > 0 ? (
          <LoadingButton
            type="button"
            pending={applying}
            className={`${formSurface.primaryButtonSm} inline-flex items-center gap-1.5`}
            onClick={() => void handleApply()}
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Adicionar selecionadas
          </LoadingButton>
        ) : null
      }
    >
      <ul className="space-y-2">
        {suggestions.map((item) => (
          <li
            key={item.key}
            className={`rounded-lg border px-3 py-2.5 text-sm ${
              item.alreadyApplied
                ? "border-slate-200/80 bg-slate-50/60 text-slate-500"
                : "border-brand-200/60 bg-brand-50/20"
            }`}
          >
            <label className="flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={selected.has(item.index)}
                disabled={item.alreadyApplied || applying}
                onChange={() => toggle(item.index)}
              />
              <span className="min-w-0 flex-1">
                <span className="font-medium text-slate-900">{item.title}</span>
                {item.description ? (
                  <span className="mt-0.5 block text-xs text-slate-600">{item.description}</span>
                ) : null}
                <span className="mt-1 block text-micro text-slate-500">
                  Prazo sugerido: {item.suggestedDeadlineDays} dias
                  {item.suggestedResponsibleArea
                    ? ` · Área: ${item.suggestedResponsibleArea}`
                    : null}
                  {item.alreadyApplied ? " · Já no plano" : null}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}
