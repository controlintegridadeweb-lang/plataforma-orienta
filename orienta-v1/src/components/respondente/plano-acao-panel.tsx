"use client";

import { ChevronRight, ChevronUp, ListChecks } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  listRespondentActionPlans,
  saveRespondentActionPlan,
} from "@/lib/action-plans/client";
import type { ActionPlanListItem } from "@/lib/action-plans/admin-service";
import type { PlanStatus } from "@/lib/action-plans/schemas";
import { STATUS_LABELS, StatusBadge } from "@/components/recomendacoes/status-badge";
import { formSurface } from "@/lib/form-surface";
import { describeError, notify } from "@/lib/notify";
import { PLAN_STATUS_LABELS, PlanStatusBadge } from "@/components/plano-acao/plan-status-badge";

function addDaysIso(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function defaultActionText(text: string): string {
  const t = text.trim();
  if (t.length >= 5) return t.slice(0, 4000);
  return "Registrar ações de adequação conforme a recomendação apresentada.";
}

function AxisSectionCell({
  axisName,
  sectionName,
}: {
  axisName: string | null | undefined;
  sectionName: string | null | undefined;
}) {
  const axis = axisName?.trim();
  const section = sectionName?.trim();
  if (!axis && !section) {
    return (
      <span className="text-xs font-normal text-slate-400" title="Não informado no formulário">
        —
      </span>
    );
  }
  return (
    <div className="space-y-0.5">
      <div className="font-medium text-slate-800">{axis ?? "—"}</div>
      <div className="text-xs text-slate-500">{section ?? "—"}</div>
    </div>
  );
}

export function RespondentPlanoAcaoPanel() {
  const [items, setItems] = useState<ActionPlanListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saveErrorByRec, setSaveErrorByRec] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listRespondentActionPlans({ view: "overview", limit: 100, offset: 0 });
      setItems(res.items);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Falha ao carregar.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const actionable = useMemo(
    () =>
      items.filter(
        (i) => i.recommendationStatus === "open" || i.recommendationStatus === "in_progress",
      ),
    [items],
  );

  async function handleSave(row: ActionPlanListItem, formData: FormData) {
    setSaveErrorByRec((prev) => {
      if (!(row.recommendationId in prev)) return prev;
      const next = { ...prev };
      delete next[row.recommendationId];
      return next;
    });
    try {
      await saveRespondentActionPlan({
        planId: row.plans[0]?.id,
        recommendationId: row.recommendationId,
        formId: row.formId,
        actionText: String(formData.get("actionText") ?? ""),
        dueDate: String(formData.get("dueDate") ?? ""),
        responsibleSector: String(formData.get("responsibleSector") ?? ""),
        responsibleName: String(formData.get("responsibleName") ?? ""),
        status: String(formData.get("status") ?? "to_implement") as PlanStatus,
        observations: String(formData.get("observations") ?? ""),
      });
      notify.success("Plano salvo com sucesso.");
      await load();
    } catch (e: unknown) {
      const msg = describeError(e, "Falha ao salvar.");
      setSaveErrorByRec((prev) => ({ ...prev, [row.recommendationId]: msg }));
      notify.error(msg);
    }
  }

  if (loading) {
    return (
      <div
        className={`p-6 ${formSurface.card}`}
        aria-busy="true"
        aria-label="Carregando planos de ação"
      >
        <div className="space-y-3 animate-pulse">
          <div className="h-4 w-48 rounded bg-slate-200" />
          <div className="h-24 rounded-lg bg-slate-100" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-200 bg-gradient-to-b from-rose-50 to-white px-4 py-3 text-sm text-rose-900 shadow-sm">
        {error}
      </div>
    );
  }

  if (actionable.length === 0) {
    return (
      <div className={formSurface.empty.container}>
        <span className={formSurface.empty.iconWrap}>
          <ListChecks className="h-5 w-5" aria-hidden />
        </span>
        <p className={formSurface.empty.title}>Nenhuma recomendação pede plano de ação agora</p>
        <p className={formSurface.empty.description}>
          Quando houver itens em aberto vinculados ao seu órgão, eles aparecerão aqui para registro
          de prazos e responsáveis.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200/90 bg-gradient-to-b from-slate-50/80 to-white px-4 py-3 shadow-sm ring-1 ring-slate-900/5 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="text-sm text-slate-700">
          <span className="font-semibold tabular-nums text-slate-900">{actionable.length}</span>
          {actionable.length === 1
            ? " recomendação aguarda o seu plano de ação."
            : " recomendações aguardam o seu plano de ação."}
        </p>
        <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-500 sm:mt-0 sm:text-right">
          A partir das recomendações do órgão, informe prazos, responsáveis e o relato da
          ação. Use o botão ao lado de cada linha para abrir o formulário.
        </p>
      </div>

      <div className={formSurface.card}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="sticky top-0 z-[1] border-b border-slate-200/80 bg-slate-50/95 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 backdrop-blur-sm">
              <tr>
                <th className="whitespace-nowrap px-4 py-3">Formulário</th>
                <th className="whitespace-nowrap px-4 py-3">Eixo / Seção</th>
                <th className="min-w-[14rem] px-4 py-3">Recomendação</th>
                <th className="whitespace-nowrap px-4 py-3">Status</th>
                <th className="whitespace-nowrap px-4 py-3">Plano</th>
                <th className="whitespace-nowrap px-4 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {actionable.map((row) => (
                <Fragment key={row.recommendationId}>
                  <tr className="align-top transition-colors hover:bg-slate-50/60">
                    <td className="px-4 py-3.5 text-slate-700">
                      <div className="font-medium text-slate-900">{row.formName}</div>
                      <div className="text-xs text-slate-500">Versão {row.formVersion}</div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <AxisSectionCell axisName={row.axisName} sectionName={row.sectionName} />
                    </td>
                    <td className="px-4 py-3.5 text-slate-700">
                      <p
                        className="max-h-32 min-w-0 overflow-y-auto whitespace-pre-wrap pr-1 text-[13px] leading-snug text-slate-800"
                        title={row.recommendationText}
                      >
                        {row.recommendationText}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.recommendationStatus} />
                    </td>
                    <td className="px-4 py-3.5">
                      {row.plans[0] ? (
                        <PlanStatusBadge status={row.plans[0].status} />
                      ) : (
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-slate-100">
                          Sem plano
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        type="button"
                        className="group inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-900 shadow-sm transition hover:border-sky-300 hover:bg-sky-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
                        onClick={() =>
                          setExpandedId((id) =>
                            id === row.recommendationId ? null : row.recommendationId,
                          )
                        }
                        aria-expanded={expandedId === row.recommendationId}
                      >
                        {expandedId === row.recommendationId ? (
                          <>
                            Fechar
                            <ChevronUp
                              className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100"
                              aria-hidden
                            />
                          </>
                        ) : (
                          <>
                            Preencher / editar
                            <ChevronRight
                              className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100"
                              aria-hidden
                            />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                  {expandedId === row.recommendationId ? (
                    <tr className="bg-slate-50/90">
                      <td colSpan={6} className="border-t border-slate-200/80 px-4 py-5">
                        <div className="mx-auto max-w-3xl space-y-4 border-l-4 border-sky-500 pl-4 sm:pl-5">
                        {saveErrorByRec[row.recommendationId] ? (
                          <p className="text-sm text-rose-600">
                            {saveErrorByRec[row.recommendationId]}
                          </p>
                        ) : null}
                        <form
                          className="grid gap-2 md:grid-cols-2"
                          onSubmit={async (e) => {
                            e.preventDefault();
                            await handleSave(row, new FormData(e.currentTarget));
                          }}
                        >
                          <label className="text-xs font-medium text-slate-700 md:col-span-2">
                            Ação ou compromisso
                            <textarea
                              name="actionText"
                              className={`${formSurface.inputTextarea} mt-1`}
                              rows={3}
                              defaultValue={
                                row.plans[0]?.actionText ?? defaultActionText(row.recommendationText)
                              }
                              required
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-700">
                            Prazo pretendido
                            <input
                              name="dueDate"
                              type="date"
                              className={`${formSurface.input} mt-1`}
                              defaultValue={row.plans[0]?.dueDate ?? addDaysIso(30)}
                              required
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-700">
                            Área responsável
                            <input
                              name="responsibleSector"
                              className={`${formSurface.input} mt-1`}
                              defaultValue={row.plans[0]?.responsibleSector ?? ""}
                              placeholder="Ex.: TI, Jurídico"
                              required
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-700">
                            Responsável nominal
                            <input
                              name="responsibleName"
                              className={`${formSurface.input} mt-1`}
                              defaultValue={row.plans[0]?.responsibleName ?? ""}
                              placeholder="Nome ou função"
                              required
                            />
                          </label>
                          <label className="text-xs font-medium text-slate-700">
                            Status do plano
                            <select
                              name="status"
                              className={`${formSurface.inputSelect} mt-1`}
                              defaultValue={row.plans[0]?.status ?? "to_implement"}
                            >
                              <option value="to_implement">
                                {PLAN_STATUS_LABELS.to_implement}
                              </option>
                              <option value="in_progress">
                                {PLAN_STATUS_LABELS.in_progress}
                              </option>
                              <option value="completed">{PLAN_STATUS_LABELS.completed}</option>
                              <option value="cancelled">{PLAN_STATUS_LABELS.cancelled}</option>
                            </select>
                          </label>
                          <label className="text-xs font-medium text-slate-700 md:col-span-2">
                            Observações / tags
                            <textarea
                              name="observations"
                              className={`${formSurface.inputTextarea} mt-1`}
                              rows={2}
                              defaultValue={row.plans[0]?.observations ?? ""}
                              placeholder="Notas livres para o acompanhamento interno"
                            />
                          </label>
                          <button
                            type="submit"
                            className={`${formSurface.primaryButton} md:col-span-2`}
                          >
                            Salvar plano de ação
                          </button>
                        </form>
                        <p className="text-[11px] text-slate-500">
                          Status da recomendação:{" "}
                          <span className="font-medium text-slate-600">
                            {STATUS_LABELS[row.recommendationStatus] ?? row.recommendationStatus}
                          </span>
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}
